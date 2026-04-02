import type { Forecast, Pair, PriceSeries, TechnicalSnapshot } from '../../src/domain/types'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const derivePlaceholderForecasts = (
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
    const drift = clamp(rawChange * 0.4 + trendBias * 0.0035, -0.035, 0.035)
    const volatilityScale = clamp(((technical?.volatilityScore ?? pair.eventRiskBase) / 100) * 0.018, 0.004, 0.04)
    const horizons = ['1W', '1M', '3M']
    const steps = [0.35, 1, 2.2]

    const basePath = horizons.map((horizon, index) => ({
      horizon,
      value: Number((last * (1 + drift * steps[index])).toFixed(pair.displayPrecision + 1)),
    }))

    const uncertaintyCurve = steps.map((step) => Number((volatilityScale * step).toFixed(4)))

    return {
      id: `fc-${pair.id}`,
      pairId: pair.id,
      horizons,
      basePath,
      optimisticPath: basePath.map((point, index) => ({
        horizon: point.horizon,
        value: Number((point.value * (1 + uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
      })),
      pessimisticPath: basePath.map((point, index) => ({
        horizon: point.horizon,
        value: Number((point.value * (1 - uncertaintyCurve[index])).toFixed(pair.displayPrecision + 1)),
      })),
      uncertaintyCurve,
      confidence: 0,
      driverImportance: {
        realizedTrend: Math.min(100, Math.abs(rawChange) * 850),
        volatility: technical?.volatilityScore ?? pair.eventRiskBase,
        eventPressure: pair.eventRiskBase,
        marketStructure: Math.min(100, Math.abs(technical?.macd ?? 0) * 180),
      },
      disclaimer:
        'Forecast engine not connected. These paths are volatility envelopes derived from current spot and realized trend, not predictive outputs.',
    }
  })
