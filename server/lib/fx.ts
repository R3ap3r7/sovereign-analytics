import type { Pool } from 'pg'
import type { Pair } from '../../src/domain/types'
import { config } from './config'

type FrankfurterRate = {
  date: string
  base: string
  quote: string
  rate: number
}

const buildRatesUrl = (params: Record<string, string>) => {
  const search = new URLSearchParams(params)
  return `${config.frankfurterBaseUrl}/rates?${search.toString()}`
}

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

const fetchRates = async (params: Record<string, string>) => {
  const response = await fetch(buildRatesUrl(params))
  if (!response.ok) throw new Error(`Frankfurter request failed: ${response.status}`)
  return (await response.json()) as FrankfurterRate[]
}

const toCrossRate = (
  dateRates: Map<string, number>,
  baseCode: string,
  quoteCode: string,
) => {
  const eurToBase = baseCode === 'EUR' ? 1 : dateRates.get(baseCode)
  const eurToQuote = quoteCode === 'EUR' ? 1 : dateRates.get(quoteCode)
  if (!eurToBase || !eurToQuote) return null
  return eurToQuote / eurToBase
}

export const syncHistoricalFx = async (database: Pool, pairs: Pair[], startDate: string, endDate: string) => {
  const quoteCodes = Array.from(
    new Set(pairs.flatMap((pair) => [pair.baseCode, pair.quoteCode]).filter((code) => code !== 'EUR')),
  ).sort()

  const rows = await fetchRates({
    from: startDate,
    to: endDate,
    quotes: quoteCodes.join(','),
    providers: config.frankfurterProvider,
  })

  const byDate = new Map<string, Map<string, number>>()
  rows.forEach((row) => {
    const dateRates = byDate.get(row.date) ?? new Map<string, number>()
    dateRates.set(row.quote, Number(row.rate))
    byDate.set(row.date, dateRates)
  })

  const inserts = Array.from(byDate.entries()).flatMap(([date, dateRates]) =>
    pairs.flatMap((pair) => {
      const rate = toCrossRate(dateRates, pair.baseCode, pair.quoteCode)
      return rate ? [{ pairId: pair.id, tradedOn: date, closeRate: Number(rate.toFixed(pair.displayPrecision + 2)) }] : []
    }),
  )

  await database.query('delete from pair_daily_rates')
  for (const batch of chunk(inserts, 500)) {
    const values: unknown[] = []
    const tuples = batch.map((row, index) => {
      const offset = index * 3
      values.push(row.pairId, row.tradedOn, row.closeRate)
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`
    })
    await database.query(
      `insert into pair_daily_rates (pair_id, traded_on, close_rate) values ${tuples.join(', ')}
       on conflict (pair_id, traded_on) do update set close_rate = excluded.close_rate`,
      values,
    )
  }
}

export const syncLatestFx = async (database: Pool, pairs: Pair[]) => {
  const quoteCodes = Array.from(
    new Set(pairs.flatMap((pair) => [pair.baseCode, pair.quoteCode]).filter((code) => code !== 'EUR')),
  ).sort()

  const rows = await fetchRates({
    quotes: quoteCodes.join(','),
    providers: config.frankfurterProvider,
  })

  const byDate = new Map<string, Map<string, number>>()
  rows.forEach((row) => {
    const dateRates = byDate.get(row.date) ?? new Map<string, number>()
    dateRates.set(row.quote, Number(row.rate))
    byDate.set(row.date, dateRates)
  })

  for (const [date, dateRates] of byDate.entries()) {
    const values: unknown[] = []
    const tuples = pairs
      .map((pair) => {
        const rate = toCrossRate(dateRates, pair.baseCode, pair.quoteCode)
        if (!rate) return null
        const offset = values.length
        values.push(pair.id, date, Number(rate.toFixed(pair.displayPrecision + 2)))
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`
      })
      .filter(Boolean)
    if (!tuples.length) continue
    await database.query(
      `insert into pair_daily_rates (pair_id, traded_on, close_rate) values ${tuples.join(', ')}
       on conflict (pair_id, traded_on) do update set close_rate = excluded.close_rate`,
      values,
    )
  }
}
