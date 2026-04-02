import type { Request } from 'express'
import type { Pool } from 'pg'
import { derivePriceSeries, deriveTechnicalSnapshot } from '../../src/domain/marketData'
import type {
  AdminMarketMutation,
  AlertRule,
  CurrencyProfile,
  Forecast,
  MacroEvent,
  MacroScenarioPreset,
  NewsItem,
  Note,
  Pair,
  PortfolioAccount,
  PortfolioJournal,
  PortfolioOrder,
  PortfolioPosition,
  SeedData,
  Session,
  Simulation,
  StrategyTemplate,
  User,
  VisitRecord,
  WatchlistItem,
} from '../../src/domain/types'
import { config } from './config'
import { deriveFallbackForecasts } from './forecast'

type BootstrapPayload = {
  seed: SeedData
  currentUser: User | null
  session: Session | null
  visited: VisitRecord
  adminMutation: AdminMarketMutation
}

type UserRow = {
  id: string
  role: User['role']
  status: User['status']
  email: string
  password: string
  display_name: string
  avatar_seed: string
  experience_level: User['experienceLevel']
  risk_profile: User['riskProfile']
  analysis_focus: User['analysisFocus']
  default_account_currency: string
  favorite_currencies: string[]
  favorite_pairs: string[]
  dashboard_preset: User['dashboardPreset']
  settings: User['settings']
  onboarding_completed: boolean
  verified: boolean
  locked: boolean
}

const readPayloadRows = async <T>(database: Pool, table: string, orderBy = 'id') => {
  const result = await database.query<{ payload: T }>(`select payload from ${table} order by ${orderBy}`)
  return result.rows.map((row: { payload: T }) => row.payload)
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  role: row.role,
  status: row.status,
  email: row.email,
  password: row.password,
  displayName: row.display_name,
  avatarSeed: row.avatar_seed,
  experienceLevel: row.experience_level,
  riskProfile: row.risk_profile,
  analysisFocus: row.analysis_focus,
  defaultAccountCurrency: row.default_account_currency,
  favoriteCurrencies: row.favorite_currencies,
  favoritePairs: row.favorite_pairs,
  dashboardPreset: row.dashboard_preset,
  settings: row.settings,
  onboardingCompleted: row.onboarding_completed,
  verified: row.verified,
  locked: row.locked,
  watchlistIds: [],
  alertIds: [],
  noteIds: [],
  portfolioId: '',
  savedSimulationIds: [],
})

const findSession = async (database: Pool, request: Request) => {
  const token = request.cookies?.[config.sessionCookieName]
  if (!token) return null
  const result = await database.query<{
    token: string
    user_id: string
    expires_at: string
    intended_path: string | null
    mock_2fa_required: boolean
  }>('select token, user_id, expires_at, intended_path, mock_2fa_required from user_sessions where token = $1', [token])
  const row = result.rows[0]
  if (!row) return null
  if (Date.parse(row.expires_at) < Date.now()) {
    await database.query('delete from user_sessions where token = $1', [token])
    return null
  }
  const session: Session = {
    userId: row.user_id,
    expiresAt: row.expires_at,
    intendedPath: row.intended_path ?? undefined,
    mock2FARequired: row.mock_2fa_required,
  }
  return { token, session }
}

export const loadBootstrap = async (database: Pool, request: Request): Promise<BootstrapPayload> => {
  const [
    currencies,
    pairs,
    events,
    news,
    forecasts,
    strategies,
    scenarios,
    simulations,
    portfolios,
    positions,
    orders,
    journals,
    watchlist,
    alerts,
    notes,
  ] = await Promise.all([
    readPayloadRows<CurrencyProfile>(database, 'currencies', 'code'),
    readPayloadRows<Pair>(database, 'pairs'),
    readPayloadRows<MacroEvent>(database, 'events'),
    readPayloadRows<NewsItem>(database, 'news', `(payload->>'timestamp')::timestamptz desc`),
    readPayloadRows<Forecast>(database, 'forecasts'),
    readPayloadRows<StrategyTemplate>(database, 'strategies'),
    readPayloadRows<MacroScenarioPreset>(database, 'scenarios'),
    readPayloadRows<Simulation>(database, 'simulations', 'updated_at desc'),
    readPayloadRows<PortfolioAccount>(database, 'portfolios'),
    readPayloadRows<PortfolioPosition>(database, 'positions'),
    readPayloadRows<PortfolioOrder>(database, 'orders'),
    readPayloadRows<PortfolioJournal>(database, 'journals', 'created_at desc'),
    readPayloadRows<WatchlistItem>(database, 'watchlist', 'created_at desc'),
    readPayloadRows<AlertRule>(database, 'alerts', 'created_at desc'),
    readPayloadRows<Note>(database, 'notes', 'updated_at desc'),
  ]) as [
    CurrencyProfile[],
    Pair[],
    MacroEvent[],
    NewsItem[],
    Forecast[],
    StrategyTemplate[],
    MacroScenarioPreset[],
    Simulation[],
    PortfolioAccount[],
    PortfolioPosition[],
    PortfolioOrder[],
    PortfolioJournal[],
    WatchlistItem[],
    AlertRule[],
    Note[],
  ]

  const userRows = await database.query<UserRow>('select * from users order by display_name asc')
  const sessions = await findSession(database, request)
  const currentUserId = sessions?.session.userId ?? null
  const adminState = await database.query<{ mutation: AdminMarketMutation }>('select mutation from admin_state where singleton = true')
  const mutation = adminState.rows[0]?.mutation ?? {
    currencyShifts: {},
    pairVolatilityShifts: {},
    newsToneShifts: {},
    triggeredEventIds: [],
  }
  const visitsResult = currentUserId
    ? await database.query<{ pairs: string[]; currencies: string[]; events: string[] }>(
        'select pairs, currencies, events from user_visits where user_id = $1',
        [currentUserId],
      )
    : { rows: [] }

  const dailyRatesResult = await database.query<{ pair_id: string; traded_on: string; close_rate: string }>(
    'select pair_id, traded_on::text, close_rate::text from pair_daily_rates order by pair_id asc, traded_on asc',
  )
  const historyByPair = new Map<string, Array<{ date: string; value: number }>>()
  dailyRatesResult.rows.forEach((row: { pair_id: string; traded_on: string; close_rate: string }) => {
    const next = historyByPair.get(row.pair_id) ?? []
    next.push({ date: row.traded_on, value: Number(row.close_rate) })
    historyByPair.set(row.pair_id, next)
  })

  const priceSeries = pairs.flatMap((pair: Pair) => derivePriceSeries(pair, historyByPair.get(pair.id) ?? []))
  const technicals = pairs.map((pair: Pair) => deriveTechnicalSnapshot(pair, priceSeries.filter((series) => series.pairId === pair.id)))
  const derivedFallback = deriveFallbackForecasts(pairs, priceSeries, technicals)
  const forecastByPair = new Map(forecasts.map((forecast: Forecast) => [forecast.pairId, forecast]))
  const hydratedForecasts = pairs.map((pair: Pair) => forecastByPair.get(pair.id) ?? derivedFallback.find((forecast) => forecast.pairId === pair.id)!).filter(Boolean)

  const portfoliosByUser = new Map(portfolios.map((portfolio: PortfolioAccount) => [portfolio.userId, portfolio.id]))
  const users = userRows.rows.map(mapUser).map((user: User) => ({
    ...user,
    watchlistIds: watchlist.filter((item: WatchlistItem) => item.userId === user.id).map((item: WatchlistItem) => item.id),
    alertIds: alerts.filter((item: AlertRule) => item.userId === user.id).map((item: AlertRule) => item.id),
    noteIds: notes.filter((item: Note) => item.userId === user.id).map((item: Note) => item.id),
    savedSimulationIds: simulations.filter((item: Simulation) => item.userId === user.id).map((item: Simulation) => item.id),
    portfolioId: portfoliosByUser.get(user.id) ?? user.portfolioId,
  }))

  const currentUser = currentUserId ? users.find((user: User) => user.id === currentUserId) ?? null : null
  const seed: SeedData = {
    users,
    currencies,
    pairs,
    priceSeries,
    technicals,
    events,
    news,
    forecasts: hydratedForecasts,
    strategies,
    scenarios,
    simulations,
    portfolios,
    positions,
    orders,
    journals,
    watchlist,
    alerts,
    notes,
  }

  return {
    seed,
    currentUser,
    session: sessions?.session ?? null,
    visited: visitsResult.rows[0] ?? { pairs: [], currencies: [], events: [] },
    adminMutation: mutation,
  }
}
