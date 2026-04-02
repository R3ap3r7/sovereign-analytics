import type { Pool } from 'pg'
import type {
  Forecast,
  ForecastDailyPoint,
  ForecastEvaluationMetrics,
  ForecastModelHorizon,
  ForecastModelMeta,
  Pair,
  PriceSeries,
  TechnicalSnapshot,
} from '../../src/domain/types'

const DAILY_HORIZON = { label: '1D', days: 1 } as const

const HORIZONS = [
  { label: '1W', days: 5 },
  { label: '1M', days: 21 },
  { label: '3M', days: 63 },
] as const

const MODEL_HORIZONS = [DAILY_HORIZON, ...HORIZONS] as const

const FEATURE_KEYS = [
  'lag1',
  'lag2',
  'lag3',
  'lag5',
  'lag10',
  'mom5',
  'mom10',
  'mom21',
  'mom63',
  'mom126',
  'vol5',
  'vol21',
  'vol63',
  'volRatio',
  'zscore21',
  'zscore63',
  'maGap21',
  'maGap63',
  'range21',
  'rangePosition21',
  'rangePosition63',
] as const

const MODEL_FAMILIES = {
  drift: ['mom5', 'mom10', 'mom21', 'mom63', 'mom126', 'maGap21'],
  autoregressive: ['lag1', 'lag2', 'lag3', 'lag5', 'lag10', 'vol5', 'vol21'],
  meanReversion: ['zscore21', 'zscore63', 'maGap21', 'maGap63', 'range21', 'volRatio', 'rangePosition21'],
  regime: ['vol5', 'vol21', 'vol63', 'volRatio', 'range21', 'rangePosition21', 'rangePosition63', 'mom21'],
  hybrid: ['lag1', 'lag2', 'lag5', 'mom5', 'mom21', 'mom63', 'vol5', 'vol21', 'volRatio', 'zscore21', 'rangePosition21', 'maGap63'],
} as const

const RIDGE_GRID = [0.001, 0.01, 0.05, 0.1, 0.5] as const

type SummaryHorizonLabel = (typeof HORIZONS)[number]['label']
type ModelHorizonLabel = (typeof MODEL_HORIZONS)[number]['label']
type FeatureKey = (typeof FEATURE_KEYS)[number]
type ModelFamily = keyof typeof MODEL_FAMILIES

type HistoryPoint = {
  date: string
  value: number
}

type Sample = {
  date: string
  currentPrice: number
  features: Record<FeatureKey, number>
  targets: Record<ModelHorizonLabel, number>
}

type RidgeModel = {
  intercept: number
  coefficients: number[]
  means: number[]
  stds: number[]
}

type CandidateFit = {
  family: ModelFamily
  lambda: number
  features: FeatureKey[]
  validationModel: RidgeModel
  validation: ForecastEvaluationMetrics
}

type TrainedMember = {
  family: ModelFamily
  lambda: number
  features: FeatureKey[]
  weight: number
  model: RidgeModel
}

type TrainedHorizonModel = {
  horizon: ModelHorizonLabel
  horizonDays: number
  family: string
  lambda: number
  features: FeatureKey[]
  validation: ForecastEvaluationMetrics
  test: ForecastEvaluationMetrics
  members: TrainedMember[]
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const mean = (values: number[]) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0)

const variance = (values: number[]) => {
  if (values.length < 2) return 0
  const avg = mean(values)
  return values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length
}

const stdev = (values: number[]) => Math.sqrt(variance(values))

const averageAbsolute = (values: number[]) => (values.length ? values.reduce((total, value) => total + Math.abs(value), 0) / values.length : 0)

const zeros = (rows: number, columns: number) =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0))

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const size = vector.length
  const augmented = matrix.map((row, index) => [...row, vector[index]])
  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) maxRow = row
    }
    if (Math.abs(augmented[maxRow][pivot]) < 1e-12) continue
    ;[augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]]
    const pivotValue = augmented[pivot][pivot]
    for (let column = pivot; column <= size; column += 1) augmented[pivot][column] /= pivotValue
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue
      const factor = augmented[row][pivot]
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column]
      }
    }
  }
  return augmented.map((row) => row[size] ?? 0)
}

const fitRidgeRegression = (rows: number[][], targets: number[], lambda: number): RidgeModel => {
  if (!rows.length || !rows[0]?.length) {
    return {
      intercept: mean(targets),
      coefficients: [],
      means: [],
      stds: [],
    }
  }

  const featureCount = rows[0].length
  const means = Array.from({ length: featureCount }, (_, index) => mean(rows.map((row) => row[index])))
  const stds = Array.from({ length: featureCount }, (_, index) => {
    const next = stdev(rows.map((row) => row[index]))
    return next > 1e-8 ? next : 1
  })
  const design = rows.map((row) => [
    1,
    ...row.map((value, index) => (value - means[index]) / stds[index]),
  ])

  const xtx = zeros(featureCount + 1, featureCount + 1)
  const xty = Array.from({ length: featureCount + 1 }, () => 0)
  design.forEach((row, rowIndex) => {
    for (let left = 0; left < row.length; left += 1) {
      xty[left] += row[left] * targets[rowIndex]
      for (let right = 0; right < row.length; right += 1) xtx[left][right] += row[left] * row[right]
    }
  })

  for (let index = 1; index < xtx.length; index += 1) xtx[index][index] += lambda

  const coefficients = solveLinearSystem(xtx, xty)
  return {
    intercept: coefficients[0] ?? 0,
    coefficients: coefficients.slice(1),
    means,
    stds,
  }
}

const predictWithRidge = (model: RidgeModel, row: number[]) =>
  model.intercept
  + row.reduce((total, value, index) => total + (((value - (model.means[index] ?? 0)) / (model.stds[index] ?? 1)) * (model.coefficients[index] ?? 0)), 0)

const scorePredictions = (
  predictions: number[],
  actuals: number[],
  currentPrices: number[],
): ForecastEvaluationMetrics => {
  if (!predictions.length || !actuals.length || !currentPrices.length) {
    return { rmseBps: 0, maeBps: 0, mape: 0, directionalAccuracy: 0 }
  }
  const errors = predictions.map((value, index) => value - actuals[index])
  const rmseBps = Math.sqrt(mean(errors.map((value) => value ** 2))) * 10000
  const maeBps = averageAbsolute(errors) * 10000
  const priceMape = mean(
    actuals.map((actual, index) => {
      const predictedPrice = currentPrices[index] * Math.exp(predictions[index])
      const actualPrice = currentPrices[index] * Math.exp(actual)
      return actualPrice ? Math.abs(predictedPrice - actualPrice) / actualPrice : 0
    }),
  )
  const directionalAccuracy = mean(
    predictions.map((value, index) => {
      const actual = actuals[index]
      if (Math.abs(actual) < 1e-10 && Math.abs(value) < 1e-10) return 1
      return Math.sign(value) === Math.sign(actual) ? 1 : 0
    }),
  )
  return {
    rmseBps: Number(rmseBps.toFixed(2)),
    maeBps: Number(maeBps.toFixed(2)),
    mape: Number((priceMape * 100).toFixed(2)),
    directionalAccuracy: Number(directionalAccuracy.toFixed(4)),
  }
}

const modelScore = (metrics: ForecastEvaluationMetrics) => metrics.rmseBps / clamp(metrics.directionalAccuracy, 0.35, 0.9)

const splitChronologically = <T,>(items: T[]) => {
  const total = items.length
  const trainEnd = Math.max(40, Math.floor(total * 0.7))
  const validationEnd = Math.max(trainEnd + 10, Math.floor(total * 0.85))
  return {
    train: items.slice(0, trainEnd),
    validation: items.slice(trainEnd, validationEnd),
    test: items.slice(validationEnd),
  }
}

const sliceValues = (values: number[], endIndex: number, length: number) => values.slice(Math.max(0, endIndex - length + 1), endIndex + 1)

const buildFeatureSet = (logs: number[], returns: number[], index: number): Record<FeatureKey, number> => {
  const last5Returns = returns.slice(index - 4, index + 1)
  const last21Returns = returns.slice(index - 20, index + 1)
  const last63Returns = returns.slice(index - 62, index + 1)
  const last21Logs = sliceValues(logs, index, 21)
  const last63Logs = sliceValues(logs, index, 63)
  const last126Logs = sliceValues(logs, index, 126)
  const mean21 = mean(last21Logs)
  const mean63 = mean(last63Logs)
  const std21 = stdev(last21Logs) || 1
  const std63 = stdev(last63Logs) || 1
  const range21 = Math.max(...last21Logs) - Math.min(...last21Logs)
  const range63 = Math.max(...last63Logs) - Math.min(...last63Logs)
  const vol5 = stdev(last5Returns)
  const vol21 = stdev(last21Returns)
  const vol63 = stdev(last63Returns)

  return {
    lag1: returns[index],
    lag2: returns[index - 1],
    lag3: returns[index - 2],
    lag5: returns[index - 4],
    lag10: returns[index - 9],
    mom5: logs[index] - logs[index - 5],
    mom10: logs[index] - logs[index - 10],
    mom21: logs[index] - logs[index - 21],
    mom63: logs[index] - logs[index - 63],
    mom126: logs[index] - (last126Logs[0] ?? logs[index]),
    vol5,
    vol21,
    vol63,
    volRatio: vol21 > 1e-8 ? vol5 / vol21 : 1,
    zscore21: (logs[index] - mean21) / std21,
    zscore63: (logs[index] - mean63) / std63,
    maGap21: logs[index] - mean21,
    maGap63: logs[index] - mean63,
    range21,
    rangePosition21: range21 > 1e-8 ? (logs[index] - Math.min(...last21Logs)) / range21 : 0.5,
    rangePosition63: range63 > 1e-8 ? (logs[index] - Math.min(...last63Logs)) / range63 : 0.5,
  }
}

const buildSamples = (history: HistoryPoint[]) => {
  if (history.length < 180) return [] as Sample[]
  const closes = history.map((point) => point.value)
  const logs = closes.map((value) => Math.log(value))
  const returns = logs.map((value, index) => (index === 0 ? 0 : value - logs[index - 1]))
  const maxHorizon = Math.max(...MODEL_HORIZONS.map((item) => item.days))
  const samples: Sample[] = []

  for (let index = 63; index < closes.length - maxHorizon; index += 1) {
    const features = buildFeatureSet(logs, returns, index)

    const targets = Object.fromEntries(
      MODEL_HORIZONS.map((horizon) => [horizon.label, logs[index + horizon.days] - logs[index]]),
    ) as Record<ModelHorizonLabel, number>

    samples.push({
      date: history[index].date,
      currentPrice: closes[index],
      features,
      targets,
    })
  }

  return samples
}

const trainBestModelForHorizon = (samples: Sample[], horizon: (typeof MODEL_HORIZONS)[number]) => {
  const split = splitChronologically(samples)
  const families = (Object.keys(MODEL_FAMILIES) as ModelFamily[]).map((family) => [
    family,
    [...MODEL_FAMILIES[family]],
  ] as [ModelFamily, FeatureKey[]])

  const candidates: CandidateFit[] = []

  for (const [family, features] of families) {
    const trainRows = split.train.map((sample) => features.map((feature) => sample.features[feature]))
    const trainTargets = split.train.map((sample) => sample.targets[horizon.label])
    const validationRows = split.validation.map((sample) => features.map((feature) => sample.features[feature]))
    const validationTargets = split.validation.map((sample) => sample.targets[horizon.label])
    const validationPrices = split.validation.map((sample) => sample.currentPrice)

    for (const lambda of RIDGE_GRID) {
      const model = fitRidgeRegression(trainRows, trainTargets, lambda)
      const predictions = validationRows.map((row) => predictWithRidge(model, row))
      const metrics = scorePredictions(predictions, validationTargets, validationPrices)
      candidates.push({ family, lambda, features, validationModel: model, validation: metrics })
    }
  }

  if (!candidates.length) return null

  const rankedCandidates = [...candidates]
    .sort((left, right) => modelScore(left.validation) - modelScore(right.validation))

  const shortlisted = rankedCandidates
    .reduce((selected, candidate) => {
      if (selected.length >= 3) return selected
      if (selected.some((item) => item.family === candidate.family)) return selected
      selected.push(candidate)
      return selected
    }, [] as CandidateFit[])

  const bestSingle = rankedCandidates[0]!
  let selectedCandidates = shortlisted.length ? shortlisted : [bestSingle]
  let rawWeights = selectedCandidates.map((candidate) => {
    const metric = candidate.validation
    return clamp(metric.directionalAccuracy, 0.35, 0.95) / Math.max(metric.rmseBps, 1)
  })

  if (selectedCandidates.length > 1) {
    const validationPredictions = split.validation.map((sample) =>
      selectedCandidates.reduce((sum, candidate, index) => {
        const row = candidate.features.map((feature) => sample.features[feature])
        return sum + rawWeights[index] * predictWithRidge(candidate.validationModel, row)
      }, 0) / (rawWeights.reduce((sum, value) => sum + value, 0) || 1),
    )
    const validationMetrics = scorePredictions(
      validationPredictions,
      split.validation.map((sample) => sample.targets[horizon.label]),
      split.validation.map((sample) => sample.currentPrice),
    )
    if (modelScore(validationMetrics) > modelScore(bestSingle.validation)) {
      selectedCandidates = [bestSingle]
      rawWeights = [1]
    }
  }

  const weightTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1

  const trainValidation = [...split.train, ...split.validation]
  const testTargets = split.test.map((sample) => sample.targets[horizon.label])
  const testPrices = split.test.map((sample) => sample.currentPrice)

  const members = selectedCandidates.map((candidate, index) => {
    const trainValidationRows = trainValidation.map((sample) => candidate.features.map((feature) => sample.features[feature]))
    const trainValidationTargets = trainValidation.map((sample) => sample.targets[horizon.label])
    const model = fitRidgeRegression(trainValidationRows, trainValidationTargets, candidate.lambda)
    return {
      family: candidate.family,
      lambda: candidate.lambda,
      features: candidate.features,
      weight: rawWeights[index] / weightTotal,
      model,
    } satisfies TrainedMember
  })

  const testPredictions = split.test.map((sample) =>
    members.reduce(
      (sum, member) =>
        sum + member.weight * predictWithRidge(member.model, member.features.map((feature) => sample.features[feature])),
      0,
    ),
  )
  const testMetrics = scorePredictions(testPredictions, testTargets, testPrices)

  const deploymentMembers = selectedCandidates.map((candidate, index) => {
    const deploymentRows = samples.map((sample) => candidate.features.map((feature) => sample.features[feature]))
    const deploymentTargets = samples.map((sample) => sample.targets[horizon.label])
    return {
      family: candidate.family,
      lambda: candidate.lambda,
      features: candidate.features,
      weight: rawWeights[index] / weightTotal,
      model: fitRidgeRegression(deploymentRows, deploymentTargets, candidate.lambda),
    } satisfies TrainedMember
  })

  const mergedFeatures = Array.from(new Set(deploymentMembers.flatMap((member) => member.features)))
  const validationSummary: ForecastEvaluationMetrics = {
    rmseBps: Number(mean(selectedCandidates.map((candidate) => candidate.validation.rmseBps)).toFixed(2)),
    maeBps: Number(mean(selectedCandidates.map((candidate) => candidate.validation.maeBps)).toFixed(2)),
    mape: Number(mean(selectedCandidates.map((candidate) => candidate.validation.mape)).toFixed(2)),
    directionalAccuracy: Number(mean(selectedCandidates.map((candidate) => candidate.validation.directionalAccuracy)).toFixed(4)),
  }

  return {
    horizon: horizon.label,
    horizonDays: horizon.days,
    family: deploymentMembers.length > 1 ? 'ensemble' : deploymentMembers[0]!.family,
    lambda: deploymentMembers.length > 1 ? 0 : deploymentMembers[0]!.lambda,
    features: mergedFeatures,
    validation: validationSummary,
    test: testMetrics,
    members: deploymentMembers,
  } satisfies TrainedHorizonModel
}

const confidenceFromModels = (models: TrainedHorizonModel[]) => {
  if (!models.length) return 0
  const averageDirectional = mean(models.map((model) => model.test.directionalAccuracy))
  const averageRmse = mean(models.map((model) => model.test.rmseBps))
  return Number(clamp(averageDirectional - averageRmse / 1000, 0.05, 0.9).toFixed(4))
}

const buildDriverImportance = (models: TrainedHorizonModel[]) => {
  const reference = models.find((model) => model.horizon === '1M') ?? models[0]
  if (!reference) return {}
  const grouped = new Map<string, number>()
  reference.members.forEach((member) => {
    member.features.forEach((feature, index) => {
      const weight = Math.abs(member.model.coefficients[index] ?? 0) * member.weight
      const group =
        feature.startsWith('lag') ? 'shortTermFlow'
          : feature.startsWith('mom') ? 'trend'
            : feature.startsWith('vol') || feature.startsWith('range') ? 'volatility'
              : 'meanReversion'
      grouped.set(group, (grouped.get(group) ?? 0) + weight)
    })
  })
  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0) || 1
  return Object.fromEntries(
    Array.from(grouped.entries()).map(([key, value]) => [key, Number(((value / total) * 100).toFixed(2))]),
  )
}

const addBusinessDays = (isoDate: string, businessDays: number) => {
  const cursor = new Date(`${isoDate}T00:00:00Z`)
  let remaining = businessDays
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const weekday = cursor.getUTCDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return cursor.toISOString().slice(0, 10)
}

const buildInterpolatedDailyPath = (
  pair: Pair,
  lastObservation: string,
  spotPrice: number,
  basePath: Array<{ horizon: SummaryHorizonLabel; value: number }>,
  uncertaintyCurve: number[],
): ForecastDailyPoint[] => {
  const anchorDays = [0, ...HORIZONS.map((item) => item.days)]
  const anchorValues = [spotPrice, ...basePath.map((point) => point.value)]
  const anchorUncertainty = [0, ...uncertaintyCurve]
  const maxDays = HORIZONS.at(-1)?.days ?? 0

  return Array.from({ length: maxDays }, (_, index) => {
    const day = index + 1
    const upperAnchorIndex = anchorDays.findIndex((anchor) => anchor >= day)
    const nextIndex = upperAnchorIndex === -1 ? anchorDays.length - 1 : upperAnchorIndex
    const prevIndex = Math.max(0, nextIndex - 1)
    const prevDay = anchorDays[prevIndex] ?? 0
    const nextDay = anchorDays[nextIndex] ?? day
    const span = Math.max(1, nextDay - prevDay)
    const ratio = clamp((day - prevDay) / span, 0, 1)
    const prevLog = Math.log(anchorValues[prevIndex] ?? spotPrice)
    const nextLog = Math.log(anchorValues[nextIndex] ?? spotPrice)
    const interpolatedLog = prevLog + (nextLog - prevLog) * ratio
    const uncertainty = (anchorUncertainty[prevIndex] ?? 0) + ((anchorUncertainty[nextIndex] ?? 0) - (anchorUncertainty[prevIndex] ?? 0)) * ratio
    const date = addBusinessDays(lastObservation, day)

    return {
      day,
      date,
      label: date,
      value: Number(Math.exp(interpolatedLog).toFixed(pair.displayPrecision + 1)),
      uncertainty: Number(uncertainty.toFixed(5)),
    }
  })
}

const buildRecursiveDailyForecastPath = (
  pair: Pair,
  lastObservation: string,
  history: HistoryPoint[],
  dailyModel: TrainedHorizonModel,
): ForecastDailyPoint[] => {
  const closes = history.map((point) => point.value)
  const logs = closes.map((value) => Math.log(value))
  const returns = logs.map((value, index) => (index === 0 ? 0 : value - logs[index - 1]))
  const maxDays = HORIZONS.at(-1)?.days ?? 63
  const baseUncertainty = Math.max(dailyModel.test.rmseBps / 10000, 0.00075)

  return Array.from({ length: maxDays }, (_, index) => {
    const day = index + 1
    const featureIndex = logs.length - 1
    const features = buildFeatureSet(logs, returns, featureIndex)
    const recentVol = Math.max(stdev(returns.slice(-21)), 0.001)
    const predictedReturn = clamp(
      dailyModel.members.reduce(
        (sum, member) =>
          sum + member.weight * predictWithRidge(member.model, member.features.map((feature) => features[feature])),
        0,
      ),
      -recentVol * 2.5,
      recentVol * 2.5,
    )
    const nextLog = logs[featureIndex] + predictedReturn
    logs.push(nextLog)
    const nextClose = Math.exp(nextLog)
    closes.push(nextClose)
    returns.push(predictedReturn)
    const date = addBusinessDays(lastObservation, day)

    return {
      day,
      date,
      label: date,
      value: Number(nextClose.toFixed(pair.displayPrecision + 1)),
      uncertainty: Number((baseUncertainty * Math.sqrt(day)).toFixed(5)),
    }
  })
}

const trainForecastForPair = (pair: Pair, history: HistoryPoint[]): Forecast | null => {
  const samples = buildSamples(history)
  if (!samples.length) return null

  const dailyModel = trainBestModelForHorizon(samples, DAILY_HORIZON)
  const models = HORIZONS.map((horizon) => trainBestModelForHorizon(samples, horizon)).filter(Boolean) as TrainedHorizonModel[]
  if (!dailyModel || !models.length) return null

  const latestSample = samples.at(-1)
  const lastPrice = history.at(-1)?.value ?? latestSample?.currentPrice ?? 0
  if (!latestSample || !lastPrice) return null

  const lastObservation = history.at(-1)?.date ?? new Date().toISOString().slice(0, 10)
  const dailyPath = buildRecursiveDailyForecastPath(pair, lastObservation, history, dailyModel)
  const basePath = HORIZONS.map((horizon) => ({
    horizon: horizon.label,
    value: dailyPath[horizon.days - 1]?.value ?? lastPrice,
  }))
  const uncertaintyCurve = HORIZONS.map((horizon) => Number((dailyPath[horizon.days - 1]?.uncertainty ?? Math.max(dailyModel.test.rmseBps / 10000, 0.0025)).toFixed(4)))

  const optimisticPath = basePath.map((point, index) => ({
    horizon: point.horizon,
    value: Number((point.value * Math.exp(uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
  }))

  const pessimisticPath = basePath.map((point, index) => ({
    horizon: point.horizon,
    value: Number((point.value * Math.exp(-uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
  }))

  const modelMeta: ForecastModelMeta = {
    trainedAt: new Date().toISOString(),
    methodology: 'Pair-specific ridge models on daily FX closes. A recursive 1-day model generates the daywise path, while direct 1W, 1M, and 3M models provide holdout evaluation across longer horizons.',
    observations: history.length,
    lastObservation,
    horizons: [dailyModel, ...models].map(
      (model) =>
        ({
          horizon: model.horizon,
          horizonDays: model.horizonDays,
          family: model.family,
          lambda: model.lambda,
          features: model.features,
          validation: model.validation,
          test: model.test,
        }) satisfies ForecastModelHorizon,
    ),
  }

  const accuracyLine = modelMeta.horizons
    .map((item) => `${item.horizon} ${Math.round(item.test.directionalAccuracy * 100)}% dir. acc.`)
    .join(', ')

  return {
    id: `fc-${pair.id}`,
    pairId: pair.id,
    spotPrice: Number(lastPrice.toFixed(pair.displayPrecision + 1)),
    horizons: HORIZONS.map((item) => item.label),
    basePath,
    optimisticPath,
    pessimisticPath,
    dailyPath,
    uncertaintyCurve,
    confidence: confidenceFromModels([dailyModel, ...models]),
    driverImportance: buildDriverImportance(models),
    disclaimer: `Pair-specific statistical model trained through ${modelMeta.lastObservation}. Holdout performance: ${accuracyLine}. External macro, event, and order-flow features are not included yet.`,
    model: modelMeta,
  }
}

const loadPairHistories = async (database: Pool) => {
  const result = await database.query<{ pair_id: string; traded_on: string; close_rate: string }>(
    'select pair_id, traded_on::text, close_rate::text from pair_daily_rates order by pair_id asc, traded_on asc',
  )
  const byPair = new Map<string, HistoryPoint[]>()
  result.rows.forEach((row) => {
    const next = byPair.get(row.pair_id) ?? []
    next.push({ date: row.traded_on, value: Number(row.close_rate) })
    byPair.set(row.pair_id, next)
  })
  return byPair
}

export const syncForecasts = async (database: Pool, pairs: Pair[]) => {
  const histories = await loadPairHistories(database)
  const forecasts = pairs
    .map((pair) => trainForecastForPair(pair, histories.get(pair.id) ?? []))
    .filter(Boolean) as Forecast[]

  for (const forecast of forecasts) {
    await database.query(
      `insert into forecasts (id, pair_id, payload)
       values ($1, $2, $3)
       on conflict (id) do update set pair_id = excluded.pair_id, payload = excluded.payload`,
      [forecast.id, forecast.pairId, forecast],
    )
  }

  return forecasts.map((forecast) => ({
    pairId: forecast.pairId,
    confidence: forecast.confidence,
    horizons: forecast.model?.horizons ?? [],
  }))
}

const fallbackClamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const deriveFallbackForecasts = (
  pairs: Pair[],
  priceSeries: PriceSeries[],
  technicals: TechnicalSnapshot[],
): Forecast[] =>
  pairs.map((pair) => {
    const monthSeries =
      priceSeries.find((series) => series.pairId === pair.id && series.timeframe === '1M')
      ?? priceSeries.find((series) => series.pairId === pair.id && series.timeframe === '3M')
      ?? priceSeries.find((series) => series.pairId === pair.id && series.timeframe === '1D')

    const technical = technicals.find((item) => item.pairId === pair.id)
    const points = monthSeries?.points ?? []
    const first = points[0]?.value ?? 0
    const last = points.at(-1)?.value ?? first
    const rawChange = first ? (last - first) / first : 0
    const trendBias = technical?.trend === 'bullish' ? 1 : technical?.trend === 'bearish' ? -1 : 0
    const drift = fallbackClamp(rawChange * 0.4 + trendBias * 0.0035, -0.035, 0.035)
    const volatilityScale = fallbackClamp(((technical?.volatilityScore ?? pair.eventRiskBase) / 100) * 0.018, 0.004, 0.04)
    const steps = [0.35, 1, 2.2]
    const lastObservation = points.at(-1)?.timestamp?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

    const basePath = HORIZONS.map((horizon, index) => ({
      horizon: horizon.label,
      value: Number((last * (1 + drift * steps[index])).toFixed(pair.displayPrecision + 1)),
    }))

    const uncertaintyCurve = steps.map((step) => Number((volatilityScale * step).toFixed(4)))

    return {
      id: `fc-${pair.id}`,
      pairId: pair.id,
      spotPrice: Number(last.toFixed(pair.displayPrecision + 1)),
      horizons: HORIZONS.map((item) => item.label),
      basePath,
      optimisticPath: basePath.map((point, index) => ({
        horizon: point.horizon,
        value: Number((point.value * (1 + uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
      })),
      pessimisticPath: basePath.map((point, index) => ({
        horizon: point.horizon,
        value: Number((point.value * (1 - uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
      })),
      dailyPath: buildInterpolatedDailyPath(pair, lastObservation, last, basePath, uncertaintyCurve),
      uncertaintyCurve,
      confidence: 0,
      driverImportance: {
        realizedTrend: Math.min(100, Math.abs(rawChange) * 850),
        volatility: technical?.volatilityScore ?? pair.eventRiskBase,
        eventPressure: pair.eventRiskBase,
        marketStructure: Math.min(100, Math.abs(technical?.macd ?? 0) * 180),
      },
      disclaimer:
        'Forecast model has not been trained yet for this pair. The current path is a volatility envelope derived from spot and realized trend.',
    }
  })
