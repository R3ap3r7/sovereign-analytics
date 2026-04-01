import type {
  AdminMarketMutation,
  AlertRule,
  CurrencyProfile,
  MacroEvent,
  NewsItem,
  Pair,
  PortfolioPosition,
  PriceSeries,
  SeedData,
  TechnicalSnapshot,
  User,
} from '../types'

export const buildSearchIndex = (seed: SeedData, user: User | null) => {
  const simulations = seed.simulations.filter((item) => !user || item.userId === user.id)
  const notes = seed.notes.filter((item) => !user || item.userId === user.id)
  return [
    ...seed.pairs.map((pair) => ({ id: pair.id, type: 'pair' as const, label: pair.symbol, href: `/app/markets/${pair.id}` })),
    ...seed.currencies.map((currency) => ({ id: currency.code, type: 'currency' as const, label: `${currency.code} · ${currency.name}`, href: `/app/currencies/${currency.code}` })),
    ...seed.events.map((event) => ({ id: event.id, type: 'event' as const, label: event.title, href: `/app/events/${event.id}` })),
    ...notes.map((note) => ({ id: note.id, type: 'note' as const, label: note.title, href: '/app/notes' })),
    ...simulations.map((simulation) => ({ id: simulation.id, type: 'simulation' as const, label: `${simulation.pairId.toUpperCase()} scenario`, href: `/app/simulation?simulation=${simulation.id}` })),
  ]
}

export const getCurrentPrice = (series: PriceSeries[]) => series[series.length - 1]?.points.at(-1)?.value ?? 0

export const getPairWorkspace = (seed: SeedData, pairId: string, user: User | null, mutation: AdminMarketMutation) => {
  const pair = seed.pairs.find((item) => item.id === pairId)
  if (!pair) return null
  const base = seed.currencies.find((item) => item.code === pair.baseCode)!
  const quote = seed.currencies.find((item) => item.code === pair.quoteCode)!
  const series = seed.priceSeries.filter((item) => item.pairId === pair.id)
  const technical = seed.technicals.find((item) => item.pairId === pair.id)!
  const eventList = seed.events.filter((item) => item.pairIds.includes(pair.id) || item.currencyCodes.includes(base.code) || item.currencyCodes.includes(quote.code))
  const newsList = seed.news.filter((item) => item.pairIds.includes(pair.id) || item.currencyCodes.includes(base.code) || item.currencyCodes.includes(quote.code))
  const forecast = seed.forecasts.find((item) => item.pairId === pair.id)!
  const simulations = seed.simulations.filter((item) => item.pairId === pair.id && (!user || item.userId === user.id))
  const positions = seed.positions.filter((item) => item.pairId === pair.id && item.status === 'open')
  const notes = seed.notes.filter(
    (note) =>
      (!user || note.userId === user.id) &&
      note.linkedEntities.some(
        (entity) => entity.entityId === pair.id || entity.entityId === base.code || entity.entityId === quote.code,
      ),
  )
  const currentPrice = getCurrentPrice(series.filter((item) => item.timeframe === '1D'))
  const volatilityShift = mutation.pairVolatilityShifts[pair.id] ?? 0
  const eventRisk = Math.min(
    100,
    Math.round(pair.eventRiskBase + eventList.reduce((acc, event) => acc + (event.impact === 'high' ? 6 : 3), 0) + volatilityShift),
  )

  return {
    pair,
    base,
    quote,
    series,
    technical: {
      ...technical,
      volatilityScore: Math.min(100, technical.volatilityScore + volatilityShift),
    },
    eventList,
    newsList,
    forecast: {
      ...forecast,
      uncertaintyCurve: forecast.uncertaintyCurve.map((item) => item + volatilityShift / 100),
    },
    simulations,
    positions,
    notes,
    currentPrice,
    eventRisk,
  }
}

export const getCurrencyWorkspace = (seed: SeedData, code: string, user: User | null, mutation: AdminMarketMutation) => {
  const currency = seed.currencies.find((item) => item.code === code)
  if (!currency) return null
  const shift = mutation.currencyShifts[code] ?? 0
  return {
    currency: {
      ...currency,
      strengthScore: Math.max(0, Math.min(100, currency.strengthScore + shift)),
      riskScore: Math.max(0, Math.min(100, currency.riskScore + Math.max(0, shift * -0.6))),
    },
    pairs: seed.pairs.filter((item) => item.baseCode === code || item.quoteCode === code),
    events: seed.events.filter((item) => item.currencyCodes.includes(code)),
    news: seed.news.filter((item) => item.currencyCodes.includes(code)),
    notes: seed.notes.filter(
      (note) => (!user || note.userId === user.id) && note.linkedEntities.some((entity) => entity.entityId === code),
    ),
  }
}

export const getEventWorkspace = (seed: SeedData, id: string) => {
  const event = seed.events.find((item) => item.id === id)
  if (!event) return null
  return {
    event,
    currencies: seed.currencies.filter((item) => event.currencyCodes.includes(item.code)),
    pairs: seed.pairs.filter((item) => event.pairIds.includes(item.id)),
    relatedNews: seed.news.filter((item) => item.eventIds.includes(event.id)),
    comparableEvents: seed.events.filter((item) => item.type === event.type && item.id !== event.id).slice(0, 3),
  }
}

export const getUserPortfolioWorkspace = (seed: SeedData, user: User | null) => {
  if (!user) return null
  const portfolio = seed.portfolios.find((item) => item.id === user.portfolioId)
  if (!portfolio) return null
  const openPositions = seed.positions.filter((item) => portfolio.openPositionIds.includes(item.id))
  const closedPositions = seed.positions.filter((item) => portfolio.closedPositionIds.includes(item.id))
  const orders = seed.orders.filter((item) => portfolio.orderIds.includes(item.id))
  const journals = seed.journals.filter((item) => portfolio.journalIds.includes(item.id))
  return { portfolio, openPositions, closedPositions, orders, journals }
}

export const getUserAlerts = (seed: SeedData, user: User | null): AlertRule[] =>
  user ? seed.alerts.filter((item) => item.userId === user.id) : []

export const getUserWatchlist = (seed: SeedData, user: User | null) =>
  user ? seed.watchlist.filter((item) => item.userId === user.id) : []

export const getUserNotes = (seed: SeedData, user: User | null) =>
  user ? seed.notes.filter((item) => item.userId === user.id) : []

export const getUserSimulations = (seed: SeedData, user: User | null) =>
  user ? seed.simulations.filter((item) => item.userId === user.id) : []

export const getCurrencyStrengthRanking = (currencies: CurrencyProfile[], mutation: AdminMarketMutation) =>
  [...currencies]
    .map((currency) => ({ ...currency, strengthScore: currency.strengthScore + (mutation.currencyShifts[currency.code] ?? 0) }))
    .sort((a, b) => b.strengthScore - a.strengthScore)

export const derivePortfolioExposure = (
  openPositions: PortfolioPosition[],
  pairs: Pair[],
  currencies: CurrencyProfile[],
) => {
  const currencyMap = Object.fromEntries(currencies.map((currency) => [currency.code, 0]))
  openPositions.forEach((position) => {
    const pair = pairs.find((item) => item.id === position.pairId)
    if (!pair) return
    const notional = position.size * position.currentPrice
    const sign = position.direction === 'long' ? 1 : -1
    currencyMap[pair.baseCode] += sign * notional
    currencyMap[pair.quoteCode] -= sign * notional
  })
  return Object.entries(currencyMap)
    .map(([code, value]) => ({ code, value }))
    .filter((item) => Math.abs(item.value) > 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

export const evaluateAlertStatus = (alert: AlertRule, seed: SeedData, mutation: AdminMarketMutation): AlertRule => {
  if (alert.conditionType === 'event_approaching') {
    const event = seed.events.find((item) => item.id === alert.entityId)
    if (event && event.urgency > 85) {
      return { ...alert, status: 'triggered', lastTriggeredAt: new Date().toISOString() }
    }
  }
  if (alert.conditionType === 'volatility_threshold') {
    const shift = mutation.pairVolatilityShifts[alert.entityId] ?? 0
    if (shift > 10) return { ...alert, status: 'triggered', lastTriggeredAt: new Date().toISOString() }
  }
  return alert
}

export const buildDashboardSnapshot = (seed: SeedData, user: User, mutation: AdminMarketMutation) => {
  const watchlist = getUserWatchlist(seed, user)
  const simulations = getUserSimulations(seed, user).slice(-3).reverse()
  const notes = getUserNotes(seed, user).slice(0, 4)
  const portfolio = getUserPortfolioWorkspace(seed, user)
  const strength = getCurrencyStrengthRanking(seed.currencies, mutation)
  const priorityCodes = new Set([...user.favoriteCurrencies, ...watchlist.filter((item) => item.entityType === 'currency').map((item) => item.entityId)])
  const pairPriority = new Set([...user.favoritePairs, ...watchlist.filter((item) => item.entityType === 'pair').map((item) => item.entityId)])

  const events = [...seed.events]
    .sort((a, b) => b.urgency - a.urgency)
    .sort((a, b) => Number(b.currencyCodes.some((code) => priorityCodes.has(code) || b.pairIds.some((pairId) => pairPriority.has(pairId)))) - Number(a.currencyCodes.some((code) => priorityCodes.has(code) || a.pairIds.some((pairId) => pairPriority.has(pairId)))))
    .slice(0, 6)

  const news = [...seed.news]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .sort((a, b) => Number(b.currencyCodes.some((code) => priorityCodes.has(code))) - Number(a.currencyCodes.some((code) => priorityCodes.has(code))))
    .slice(0, 6)

  const highlightedPairs = seed.pairs.filter((pair) => pairPriority.has(pair.id)).slice(0, 5)
  const forecasts = seed.forecasts.filter((item) => highlightedPairs.some((pair) => pair.id === item.pairId)).slice(0, 4)

  const summary = `Macro risk elevated in ${events
    .slice(0, 2)
    .flatMap((event) => event.currencyCodes)
    .slice(0, 3)
    .join(', ')}; ${events.filter((event) => event.impact === 'high').length} high-impact events ahead; largest active focus is ${
    simulations[0]?.pairId?.toUpperCase() ?? highlightedPairs[0]?.symbol ?? 'EUR/USD'
  }.`

  return { watchlist, simulations, notes, portfolio, strength, events, news, highlightedPairs, forecasts, summary }
}

export const pairNarrative = (
  pair: Pair,
  technical: TechnicalSnapshot,
  base: CurrencyProfile,
  quote: CurrencyProfile,
  events: MacroEvent[],
  news: NewsItem[],
) => {
  const eventPressure = events.filter((event) => event.impact === 'high').length
  const bullishNews = news.filter((item) => item.sentiment === 'bullish').length
  const bearishNews = news.filter((item) => item.sentiment === 'bearish').length
  const strongerSide = base.strengthScore >= quote.strengthScore ? base.code : quote.code
  return `${pair.symbol}: ${strongerSide} remains relatively stronger, technical bias is ${technical.trend}, and ${eventPressure > 1 ? 'event risk is elevated' : 'calendar risk is manageable'} with ${bullishNews}/${bearishNews} supportive versus negative tagged stories.`
}
