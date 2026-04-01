import { describe, expect, it } from 'vitest'
import { seedData } from '../domain/seed/data'

describe('seeded market graph', () => {
  it('keeps each pair linked to existing currencies and forecasts', () => {
    for (const pair of seedData.pairs) {
      expect(seedData.currencies.some((currency) => currency.code === pair.baseCode)).toBe(true)
      expect(seedData.currencies.some((currency) => currency.code === pair.quoteCode)).toBe(true)
      expect(seedData.forecasts.some((forecast) => forecast.id === pair.forecastRef)).toBe(true)
    }
  })

  it('keeps every event attached to at least one currency', () => {
    for (const event of seedData.events) {
      expect(event.currencyCodes.length).toBeGreaterThan(0)
    }
  })
})
