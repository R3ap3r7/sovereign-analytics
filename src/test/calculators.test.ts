import { describe, expect, it } from 'vitest'
import { calculateTradeOutputs, generateMonteCarloSummary } from '../domain/calculators'

describe('simulation calculators', () => {
  it('computes consistent trade outputs for a long EUR/USD scenario', () => {
    const outputs = calculateTradeOutputs({
      symbol: 'EUR/USD',
      direction: 'long',
      capital: 10000,
      leverage: 5,
      entry: 1.08,
      exit: 1.09,
      stopLoss: 1.075,
      takeProfit: 1.095,
      positionSize: 50000,
      spread: 1.4,
      fees: 12,
    })

    expect(outputs.grossPnL).toBeGreaterThan(0)
    expect(outputs.rewardAmount).toBeGreaterThan(outputs.riskAmount)
    expect(outputs.marginUsed).toBeGreaterThan(0)
    expect(outputs.balanceAfterTrade).toBeCloseTo(10000 + outputs.netPnL, 6)
  })

  it('returns a deterministic monte carlo summary shape', () => {
    const summary = generateMonteCarloSummary({
      capital: 20000,
      trades: 20,
      winRate: 0.55,
      averageR: 1.7,
      riskPerTrade: 1,
      streakIntensity: 2,
    })

    expect(summary.paths).toHaveLength(24)
    expect(summary.best).toBeGreaterThanOrEqual(summary.median)
    expect(summary.median).toBeGreaterThanOrEqual(summary.worst)
  })
})
