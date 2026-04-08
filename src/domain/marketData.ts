import type { DerivedIndicators, OhlcPoint, Pair, PricePoint, PriceSeries, TechnicalSnapshot } from './types'

type DailyClosePoint = {
  date: string
  value: number
}

const timeframeConfig: Record<PriceSeries['timeframe'], { lookbackDays: number; points: number }> = {
  '1D': { lookbackDays: 35, points: 24 },
  '1W': { lookbackDays: 56, points: 28 },
  '1M': { lookbackDays: 90, points: 30 },
  '3M': { lookbackDays: 180, points: 36 },
  '6M': { lookbackDays: 365, points: 40 },
  '1Y': { lookbackDays: 365, points: 52 },
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

const round = (value: number, precision: number) => Number(value.toFixed(precision))

const rollingAverage = (values: number[], window: number, precision: number) =>
  values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1)
    return round(average(slice), precision)
  })

const emaSeries = (values: number[], window: number) => {
  if (!values.length) return []
  const multiplier = 2 / (window + 1)
  const result: number[] = [values[0]]
  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * multiplier + result[index - 1] * (1 - multiplier))
  }
  return result
}

const standardDeviation = (values: number[]) => {
  if (!values.length) return 0
  const mean = average(values)
  const variance = average(values.map((value) => (value - mean) ** 2))
  return Math.sqrt(variance)
}

const buildOhlc = (pair: Pair, points: PricePoint[]): OhlcPoint[] =>
  points.map((point, index) => {
    const open = index === 0 ? point.value : points[index - 1].value
    const change = Math.abs(point.value - open) || pair.pipPrecision * 8
    return {
      ...point,
      open: round(open, pair.displayPrecision),
      high: round(Math.max(open, point.value) + change * 0.45, pair.displayPrecision),
      low: round(Math.min(open, point.value) - change * 0.4, pair.displayPrecision),
      close: point.value,
    }
  })

const computeRsi = (values: number[]) => {
  if (values.length < 2) return 50
  const deltas = values.slice(1).map((value, index) => value - values[index])
  const gains = deltas.map((value) => (value > 0 ? value : 0))
  const losses = deltas.map((value) => (value < 0 ? Math.abs(value) : 0))
  const avgGain = average(gains.slice(-14))
  const avgLoss = average(losses.slice(-14))
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Number((100 - 100 / (1 + rs)).toFixed(2))
}

const deriveIndicators = (pair: Pair, points: PricePoint[], ohlcPoints: OhlcPoint[]): DerivedIndicators => {
  const closes = points.map((point) => point.value)
  const ma20 = rollingAverage(closes, 20, pair.displayPrecision)
  const ma50 = rollingAverage(closes, 50, pair.displayPrecision)
  const ema12 = emaSeries(closes, 12)
  const ema26 = emaSeries(closes, 26)
  const macdSeries = closes.map((_, index) => Number((ema12[index] - ema26[index]).toFixed(4)))
  const signalSeries = emaSeries(macdSeries, 9).map((value) => Number(value.toFixed(4)))
  const histogramSeries = macdSeries.map((value, index) => Number((value - signalSeries[index]).toFixed(4)))
  const bands = points.map((_, index) => {
    const slice = closes.slice(Math.max(0, index - 19), index + 1)
    const center = average(slice)
    const deviation = standardDeviation(slice)
    return {
      upper: round(center + deviation * 2, pair.displayPrecision),
      lower: round(center - deviation * 2, pair.displayPrecision),
    }
  })
  const atrValues = ohlcPoints.map((point, index) => {
    const previousClose = index === 0 ? point.close : ohlcPoints[index - 1].close
    return Math.max(point.high - point.low, Math.abs(point.high - previousClose), Math.abs(point.low - previousClose))
  })

  return {
    ma20,
    ma50,
    rsi: computeRsi(closes),
    macd: Number(macdSeries.at(-1)?.toFixed(2) ?? 0),
    signal: Number(signalSeries.at(-1)?.toFixed(2) ?? 0),
    histogram: Number(histogramSeries.at(-1)?.toFixed(2) ?? 0),
    upperBand: bands.map((band) => band.upper),
    lowerBand: bands.map((band) => band.lower),
    atr: Number(average(atrValues.slice(-14)).toFixed(2)),
  }
}

const sampleWindow = (history: DailyClosePoint[], timeframe: PriceSeries['timeframe']) => {
  const config = timeframeConfig[timeframe]
  const endDate = new Date(history.at(-1)?.date ?? new Date().toISOString())
  const startTime = endDate.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000
  const sliced = history.filter((point) => new Date(point.date).getTime() >= startTime)
  if (sliced.length <= config.points) return sliced
  const step = (sliced.length - 1) / Math.max(config.points - 1, 1)
  return Array.from({ length: config.points }, (_, index) => sliced[Math.min(sliced.length - 1, Math.round(index * step))])
}

export const derivePriceSeries = (pair: Pair, history: DailyClosePoint[]): PriceSeries[] => {
  let simulatedHistory = [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  
  if (simulatedHistory.length < 2) {
    const basePrice = simulatedHistory.length > 0 ? simulatedHistory[0].value : (pair as any).spotPrice ?? 1.0500;
    simulatedHistory = Array.from({ length: 90 }, (_, i) => {
      const noise = (Math.random() - 0.49) * pair.pipPrecision * 15;
      const price = basePrice + Math.sin(i / 8) * pair.pipPrecision * 50 + noise + i * pair.pipPrecision * 1.5;
      return {
        date: new Date(Date.now() - (89 - i) * 86400000).toISOString(),
        value: round(price, pair.displayPrecision)
      }
    });
  }

  const ordered = simulatedHistory;
  return (Object.keys(timeframeConfig) as PriceSeries['timeframe'][]).map((timeframe) => {
    const sampled = sampleWindow(ordered, timeframe)
    const points: PricePoint[] = sampled.map((point, index) => ({
      label: `${timeframe}-${index + 1}`,
      timestamp: point.date,
      value: round(point.value, pair.displayPrecision),
    }))
    const ohlcPoints = buildOhlc(pair, points)
    return {
      pairId: pair.id,
      timeframe,
      points,
      ohlcPoints,
      derivedIndicators: deriveIndicators(pair, points, ohlcPoints),
    }
  })
}

export const deriveTechnicalSnapshot = (pair: Pair, seriesSet: PriceSeries[]): TechnicalSnapshot => {
  const series = seriesSet.find((item) => item.timeframe === '3M') ?? seriesSet[0]
  const latest = series.points.at(-1)?.value ?? 0
  const short = series.derivedIndicators.ma20.at(-1) ?? latest
  const long = series.derivedIndicators.ma50.at(-1) ?? latest
  const trend = short > long * 1.001 ? 'bullish' : short < long * 0.999 ? 'bearish' : 'neutral'
  const volatilityScore = Math.min(100, Math.max(20, Math.round((series.derivedIndicators.atr / Math.max(latest, pair.pipPrecision)) * 10000)))

  return {
    id: `tech-${pair.id}`,
    pairId: pair.id,
    trend,
    maSet: { short, long },
    rsi: series.derivedIndicators.rsi,
    macd: series.derivedIndicators.macd,
    bollinger: {
      upper: series.derivedIndicators.upperBand.at(-1) ?? latest,
      middle: latest,
      lower: series.derivedIndicators.lowerBand.at(-1) ?? latest,
    },
    atr: series.derivedIndicators.atr,
    supportZones: [round(latest * 0.9925, pair.displayPrecision), round(latest * 0.986, pair.displayPrecision)],
    resistanceZones: [round(latest * 1.0075, pair.displayPrecision), round(latest * 1.014, pair.displayPrecision)],
    channel: {
      low: round(latest * 0.989, pair.displayPrecision),
      high: round(latest * 1.011, pair.displayPrecision),
    },
    volatilityScore,
    signalSummary:
      series.derivedIndicators.rsi > 63
        ? 'Momentum is extended higher; trend persistence remains intact but overbought risk is rising.'
        : series.derivedIndicators.rsi < 40
          ? 'Momentum is soft and rallies are fading into resistance.'
          : 'Momentum is balanced; directional conviction depends on macro and event flow.',
    driverWeights: {
      technical: 0.36,
      macro: 0.28,
      event: 0.18,
      sentiment: 0.18,
    },
  }
}
