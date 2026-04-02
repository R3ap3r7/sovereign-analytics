import express from 'express'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateTradeOutputs } from '../src/domain/calculators'
import type {
  AlertRule,
  Note,
  PortfolioAccount,
  PortfolioJournal,
  PortfolioPosition,
  Settings,
  Simulation,
  User,
  VisitRecord,
  WatchlistItem,
} from '../src/domain/types'
import { config } from './lib/config'
import { ensureSchema, pool, withTransaction } from './lib/db'
import { loadBootstrap } from './lib/bootstrap'
import { syncForecasts } from './lib/forecast'
import { syncLatestFx } from './lib/fx'
import { syncNewsAndEvents } from './lib/news'
import { referencePairs } from './lib/reference'
import { initializeDatabase, resetMutableState } from './lib/seed'

const app = express()

app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))

const getBootstrap = async (request: express.Request) => loadBootstrap(pool, request)

const setSessionCookie = (response: express.Response, token: string) => {
  response.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  })
}

const clearSessionCookie = (response: express.Response) => {
  response.clearCookie(config.sessionCookieName, { path: '/' })
}

const findSessionToken = (request: express.Request) => request.cookies?.[config.sessionCookieName] as string | undefined

const requireCurrentUser = async (request: express.Request) => {
  const bootstrap = await getBootstrap(request)
  if (!bootstrap.currentUser) throw new Error('No active user')
  return {
    ...bootstrap,
    currentUser: bootstrap.currentUser,
  }
}

app.get('/api/health', async (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/bootstrap', async (request, response) => {
  response.json(await getBootstrap(request))
})

app.post('/api/auth/login', async (request, response) => {
  const { email, password, intendedPath } = request.body as { email: string; password: string; intendedPath?: string }
  const result = await pool.query<{
    id: string
    password: string
    locked: boolean
    verified: boolean
    status: User['status']
    settings: Settings
  }>('select id, password, locked, verified, status, settings from users where email = $1', [email])
  const user = result.rows[0]
  if (!user || user.password !== password) return response.status(400).json({ message: 'Invalid demo credentials.' })
  if (user.locked) return response.status(400).json({ message: 'This demo persona is locked to test auth edge cases.' })
  const token = randomUUID()
  const mock2FARequired = !user.verified || user.status === 'unverified' || Boolean(user.settings.mock2FAEnabled)
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  await pool.query(
    'insert into user_sessions (token, user_id, expires_at, intended_path, mock_2fa_required) values ($1, $2, $3, $4, $5)',
    [token, user.id, expiresAt, intendedPath ?? null, mock2FARequired],
  )
  setSessionCookie(response, token)
  response.json({ requiresVerification: mock2FARequired })
})

app.post('/api/auth/signup', async (request, response) => {
  const { displayName, email, password } = request.body as { displayName: string; email: string; password: string }
  const userId = `user-${email.replace(/[^a-z]/gi, '').toLowerCase()}`
  const settings: Settings = {
    theme: 'terminal',
    density: 'research',
    chartDefaults: { chartMode: 'line', timeframe: '1M', overlays: ['ma', 'forecast'] },
    dashboardMode: 'compact',
    notificationPrefs: { alerts: true, news: true, events: true },
    favoriteCurrencies: ['USD'],
    favoritePairs: ['eur-usd'],
    defaultAccountCurrency: 'USD',
    mock2FAEnabled: true,
    widgetOrder: ['summary', 'strength', 'pairs', 'events', 'portfolio', 'simulations', 'forecast', 'news', 'continue'],
  }
  await withTransaction(async (client) => {
    await client.query(
      `insert into users (
        id, role, status, email, password, display_name, avatar_seed,
        experience_level, risk_profile, analysis_focus, default_account_currency,
        favorite_currencies, favorite_pairs, dashboard_preset, settings,
        onboarding_completed, verified, locked
      ) values (
        $1,'user','unverified',$2,$3,$4,$5,
        'beginner','conservative','macro','USD',
        $6,$7,'compact',$8,
        false,false,false
      )`,
      [userId, email, password, displayName, displayName.toLowerCase(), ['USD'], ['eur-usd'], settings],
    )
    await client.query('insert into user_visits (user_id, pairs, currencies, events) values ($1, $2, $3, $4)', [userId, [], [], []])
    await client.query(
      'insert into portfolios (id, user_id, payload) values ($1, $2, $3)',
      [
        `portfolio-${userId}`,
        userId,
        {
          id: `portfolio-${userId}`,
          userId,
          baseCurrency: 'USD',
          startingBalance: 15000,
          balance: 15000,
          equity: 15000,
          marginUsed: 0,
          freeMargin: 15000,
          openPositionIds: [],
          closedPositionIds: [],
          orderIds: [],
          journalIds: [],
        },
      ],
    )
  })
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  await pool.query(
    'insert into user_sessions (token, user_id, expires_at, intended_path, mock_2fa_required) values ($1, $2, $3, $4, $5)',
    [token, userId, expiresAt, null, true],
  )
  setSessionCookie(response, token)
  response.json({ ok: true })
})

app.post('/api/auth/verify', async (request, response) => {
  const token = findSessionToken(request)
  if (!token) return response.status(400).json({ message: 'No verification session found.' })
  const sessionResult = await pool.query<{ user_id: string }>('select user_id from user_sessions where token = $1', [token])
  const session = sessionResult.rows[0]
  if (!session) return response.status(400).json({ message: 'No verification session found.' })
  await pool.query('update user_sessions set mock_2fa_required = false where token = $1', [token])
  await pool.query("update users set verified = true, status = case when status = 'unverified' then 'active' else status end where id = $1", [session.user_id])
  response.json({ ok: true })
})

app.post('/api/auth/logout', async (request, response) => {
  const token = findSessionToken(request)
  if (token) await pool.query('delete from user_sessions where token = $1', [token])
  clearSessionCookie(response)
  response.json({ ok: true })
})

app.post('/api/settings', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const settings = request.body as Settings
  await pool.query(
    `update users
     set settings = $2,
         favorite_currencies = $3,
         favorite_pairs = $4,
         default_account_currency = $5,
         dashboard_preset = $6
     where id = $1`,
    [currentUser.id, settings, settings.favoriteCurrencies, settings.favoritePairs, settings.defaultAccountCurrency, settings.dashboardMode],
  )
  response.json({ ok: true })
})

app.post('/api/onboarding/complete', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const patch = request.body as Partial<User>
  await pool.query(
    `update users
     set experience_level = $2,
         analysis_focus = $3,
         favorite_currencies = $4,
         favorite_pairs = $5,
         risk_profile = $6,
         dashboard_preset = $7,
         default_account_currency = $8,
         onboarding_completed = true
     where id = $1`,
    [
      currentUser.id,
      patch.experienceLevel ?? currentUser.experienceLevel,
      patch.analysisFocus ?? currentUser.analysisFocus,
      patch.favoriteCurrencies ?? currentUser.favoriteCurrencies,
      patch.favoritePairs ?? currentUser.favoritePairs,
      patch.riskProfile ?? currentUser.riskProfile,
      patch.dashboardPreset ?? currentUser.dashboardPreset,
      patch.defaultAccountCurrency ?? currentUser.defaultAccountCurrency,
    ],
  )
  response.json({ ok: true })
})

app.post('/api/onboarding/reset', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  await pool.query('update users set onboarding_completed = false where id = $1', [currentUser.id])
  response.json({ ok: true })
})

app.post('/api/persona/switch', async (request, response) => {
  const { userId } = request.body as { userId: string }
  const token = randomUUID()
  const userResult = await pool.query<{ verified: boolean; settings: Settings }>('select verified, settings from users where id = $1', [userId])
  const user = userResult.rows[0]
  if (!user) return response.status(404).json({ message: 'Persona not found' })
  await pool.query(
    'insert into user_sessions (token, user_id, expires_at, intended_path, mock_2fa_required) values ($1, $2, $3, $4, $5)',
    [token, userId, new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), '/app/dashboard', Boolean(user.settings.mock2FAEnabled && user.verified)],
  )
  setSessionCookie(response, token)
  response.json({ ok: true })
})

app.post('/api/admin/mutation', async (request, response) => {
  const mutation = request.body
  await pool.query(
    'insert into admin_state (singleton, mutation) values (true, $1) on conflict (singleton) do update set mutation = excluded.mutation',
    [mutation],
  )
  response.json({ ok: true })
})

app.post('/api/admin/reset', async (_request, response) => {
  await pool.query(
    'insert into admin_state (singleton, mutation) values (true, $1) on conflict (singleton) do update set mutation = excluded.mutation',
    [{ currencyShifts: {}, pairVolatilityShifts: {}, newsToneShifts: {}, triggeredEventIds: [] }],
  )
  response.json({ ok: true })
})

app.post('/api/demo/reset', async (_request, response) => {
  await resetMutableState()
  response.json({ ok: true })
})

app.post('/api/simulations/save', async (request, response) => {
  const simulation = request.body as Simulation
  await pool.query(
    `insert into simulations (id, user_id, pair_id, created_at, updated_at, payload)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update set pair_id = excluded.pair_id, updated_at = excluded.updated_at, payload = excluded.payload`,
    [simulation.id, simulation.userId, simulation.pairId, simulation.createdAt, simulation.updatedAt, simulation],
  )
  response.json({ ok: true })
})

app.post('/api/simulations/:id/duplicate', async (request, response) => {
  const source = await pool.query<{ payload: Simulation }>('select payload from simulations where id = $1', [request.params.id])
  const simulation = source.rows[0]?.payload
  if (!simulation) return response.status(404).json({ message: 'Simulation not found' })
  const duplicate: Simulation = {
    ...simulation,
    id: `${simulation.id}-copy-${Date.now()}`,
    sourceContext: 'saved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await pool.query(
    'insert into simulations (id, user_id, pair_id, created_at, updated_at, payload) values ($1, $2, $3, $4, $5, $6)',
    [duplicate.id, duplicate.userId, duplicate.pairId, duplicate.createdAt, duplicate.updatedAt, duplicate],
  )
  response.json(duplicate)
})

app.post('/api/watchlist/upsert', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const input = request.body as { entityType: WatchlistItem['entityType']; entityId: string; priority: WatchlistItem['priority'] }
  const existing = await pool.query<{ id: string; payload: WatchlistItem }>(
    'select id, payload from watchlist where user_id = $1 and entity_type = $2 and entity_id = $3',
    [currentUser.id, input.entityType, input.entityId],
  )
  const next: WatchlistItem = existing.rows[0]?.payload
    ? { ...existing.rows[0].payload, priority: input.priority }
    : {
        id: `watch-${Date.now()}`,
        userId: currentUser.id,
        entityType: input.entityType,
        entityId: input.entityId,
        createdAt: new Date().toISOString(),
        priority: input.priority,
      }
  await pool.query(
    `insert into watchlist (id, user_id, entity_type, entity_id, created_at, priority, payload)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set priority = excluded.priority, payload = excluded.payload`,
    [next.id, next.userId, next.entityType, next.entityId, next.createdAt, next.priority, next],
  )
  response.json({ ok: true })
})

app.post('/api/watchlist/toggle', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const input = request.body as { entityType: WatchlistItem['entityType']; entityId: string; priority: WatchlistItem['priority'] }
  const existing = await pool.query<{ id: string }>(
    'select id from watchlist where user_id = $1 and entity_type = $2 and entity_id = $3',
    [currentUser.id, input.entityType, input.entityId],
  )
  if (existing.rows[0]) {
    await pool.query('delete from watchlist where id = $1', [existing.rows[0].id])
  } else {
    const item: WatchlistItem = {
      id: `watch-${Date.now()}`,
      userId: currentUser.id,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: new Date().toISOString(),
      priority: input.priority,
    }
    await pool.query(
      'insert into watchlist (id, user_id, entity_type, entity_id, created_at, priority, payload) values ($1, $2, $3, $4, $5, $6, $7)',
      [item.id, item.userId, item.entityType, item.entityId, item.createdAt, item.priority, item],
    )
  }
  response.json({ ok: true })
})

app.post('/api/alerts', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const input = request.body as Omit<AlertRule, 'id' | 'createdAt' | 'lastEvaluation' | 'status' | 'userId'>
  const alert: AlertRule = {
    ...input,
    id: `alert-${Date.now()}`,
    userId: currentUser.id,
    createdAt: new Date().toISOString(),
    lastEvaluation: new Date().toISOString(),
    status: 'active',
  }
  await pool.query(
    'insert into alerts (id, user_id, entity_type, entity_id, status, created_at, payload) values ($1, $2, $3, $4, $5, $6, $7)',
    [alert.id, alert.userId, alert.entityType, alert.entityId, alert.status, alert.createdAt, alert],
  )
  response.json(alert)
})

app.patch('/api/alerts/:id', async (request, response) => {
  const current = await pool.query<{ payload: AlertRule }>('select payload from alerts where id = $1', [request.params.id])
  const alert = current.rows[0]?.payload
  if (!alert) return response.status(404).json({ message: 'Alert not found' })
  const next: AlertRule = { ...alert, ...request.body, lastEvaluation: new Date().toISOString() }
  await pool.query('update alerts set status = $2, payload = $3 where id = $1', [request.params.id, next.status, next])
  response.json(next)
})

app.delete('/api/alerts/:id', async (request, response) => {
  await pool.query('delete from alerts where id = $1', [request.params.id])
  response.json({ ok: true })
})

app.post('/api/notes', async (request, response) => {
  const note = request.body as Note
  await pool.query('insert into notes (id, user_id, pinned, updated_at, payload) values ($1, $2, $3, $4, $5)', [note.id, note.userId, note.pinned, note.updatedAt, note])
  response.json(note)
})

app.put('/api/notes/:id', async (request, response) => {
  const note = request.body as Note
  await pool.query('update notes set pinned = $2, updated_at = $3, payload = $4 where id = $1', [note.id, note.pinned, note.updatedAt, note])
  response.json(note)
})

app.post('/api/notes/:id/pin', async (request, response) => {
  const current = await pool.query<{ payload: Note }>('select payload from notes where id = $1', [request.params.id])
  const note = current.rows[0]?.payload
  if (!note) return response.status(404).json({ message: 'Note not found' })
  const next = { ...note, pinned: Boolean(request.body?.pinned), updatedAt: new Date().toISOString() }
  await pool.query('update notes set pinned = $2, updated_at = $3, payload = $4 where id = $1', [note.id, next.pinned, next.updatedAt, next])
  response.json(next)
})

app.post('/api/portfolio/open', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const simulation = request.body as Simulation
  const bootstrap = await getBootstrap(request)
  const pair = bootstrap.seed.pairs.find((item) => item.id === simulation.pairId)
  if (!pair) return response.status(404).json({ message: 'Pair not found' })
  const outputs = calculateTradeOutputs({
    symbol: pair.symbol,
    direction: simulation.direction,
    capital: simulation.capital,
    leverage: simulation.leverage,
    entry: simulation.entry,
    exit: simulation.exit,
    stopLoss: simulation.stopLoss,
    takeProfit: simulation.takeProfit,
    positionSize: simulation.positionSize,
    spread: simulation.spread,
    fees: simulation.fees,
  })
  const position: PortfolioPosition = {
    id: `pos-${Date.now()}`,
    pairId: simulation.pairId,
    direction: simulation.direction,
    size: simulation.positionSize,
    entry: simulation.entry,
    currentPrice: simulation.exit,
    stopLoss: simulation.stopLoss,
    takeProfit: simulation.takeProfit,
    openedAt: new Date().toISOString(),
    status: 'open',
    originSimulationId: simulation.id,
    unrealizedPnL: outputs.netPnL,
    leverage: simulation.leverage,
  }
  const order = {
    id: `ord-${Date.now()}`,
    pairId: position.pairId,
    action: 'open' as const,
    timestamp: new Date().toISOString(),
    detail: `Opened from simulation ${simulation.id}.`,
  }
  await pool.query('insert into positions (id, pair_id, status, payload) values ($1, $2, $3, $4)', [position.id, position.pairId, position.status, position])
  await pool.query('insert into orders (id, pair_id, action, payload) values ($1, $2, $3, $4)', [order.id, order.pairId, order.action, order])
  const portfolios = await pool.query<{ payload: PortfolioAccount }>('select payload from portfolios where user_id = $1', [currentUser.id])
  const portfolio = portfolios.rows[0]?.payload
  if (portfolio) {
    const next = {
      ...portfolio,
      openPositionIds: [position.id, ...portfolio.openPositionIds],
      orderIds: [order.id, ...portfolio.orderIds],
    }
    await pool.query('update portfolios set payload = $2 where id = $1', [portfolio.id, next])
  }
  response.json(position)
})

app.post('/api/portfolio/close/:id', async (request, response) => {
  const current = await pool.query<{ payload: PortfolioPosition }>('select payload from positions where id = $1', [request.params.id])
  const position = current.rows[0]?.payload
  if (!position) return response.status(404).json({ message: 'Position not found' })
  const next: PortfolioPosition = {
    ...position,
    status: 'closed',
    closedAt: new Date().toISOString(),
    realizedPnL: position.unrealizedPnL,
    unrealizedPnL: 0,
  }
  await pool.query('update positions set status = $2, payload = $3 where id = $1', [position.id, next.status, next])
  const order = {
    id: `ord-${Date.now()}`,
    pairId: position.pairId,
    action: 'close' as const,
    timestamp: new Date().toISOString(),
    detail: 'Position closed from portfolio workspace.',
  }
  await pool.query('insert into orders (id, pair_id, action, payload) values ($1, $2, $3, $4)', [order.id, order.pairId, order.action, order])
  const { currentUser } = await requireCurrentUser(request)
  const portfolios = await pool.query<{ payload: PortfolioAccount }>('select payload from portfolios where user_id = $1', [currentUser.id])
  const portfolio = portfolios.rows[0]?.payload
  if (portfolio) {
    const nextPortfolio = {
      ...portfolio,
      openPositionIds: portfolio.openPositionIds.filter((id: string) => id !== position.id),
      closedPositionIds: [position.id, ...portfolio.closedPositionIds],
      orderIds: [order.id, ...portfolio.orderIds],
    }
    await pool.query('update portfolios set payload = $2 where id = $1', [portfolio.id, nextPortfolio])
  }
  response.json(next)
})

app.patch('/api/portfolio/:id', async (request, response) => {
  const current = await pool.query<{ payload: PortfolioPosition }>('select payload from positions where id = $1', [request.params.id])
  const position = current.rows[0]?.payload
  if (!position) return response.status(404).json({ message: 'Position not found' })
  const next = { ...position, ...request.body }
  await pool.query('update positions set payload = $2 where id = $1', [position.id, next])
  response.json(next)
})

app.post('/api/portfolio/journal', async (request, response) => {
  const journal: PortfolioJournal = {
    id: `jr-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...request.body,
  }
  await pool.query('insert into journals (id, pair_id, created_at, payload) values ($1, $2, $3, $4)', [journal.id, journal.pairId ?? null, journal.createdAt, journal])
  const { currentUser } = await requireCurrentUser(request)
  const portfolios = await pool.query<{ payload: PortfolioAccount }>('select payload from portfolios where user_id = $1', [currentUser.id])
  const portfolio = portfolios.rows[0]?.payload
  if (portfolio) {
    const next = { ...portfolio, journalIds: [journal.id, ...portfolio.journalIds] }
    await pool.query('update portfolios set payload = $2 where id = $1', [portfolio.id, next])
  }
  response.json(journal)
})

app.post('/api/visited', async (request, response) => {
  const { currentUser } = await requireCurrentUser(request)
  const { type, value } = request.body as { type: keyof VisitRecord; value: string }
  const visits = await pool.query<{ pairs: string[]; currencies: string[]; events: string[] }>(
    'select pairs, currencies, events from user_visits where user_id = $1',
    [currentUser.id],
  )
  const current = visits.rows[0] ?? { pairs: [], currencies: [], events: [] }
  const nextValues = [value, ...current[type].filter((item: string) => item !== value)].slice(0, 5)
  await pool.query(`update user_visits set ${type} = $2 where user_id = $1`, [currentUser.id, nextValues])
  response.json({ ok: true })
})

const currentFile = fileURLToPath(import.meta.url)
const distDir = resolve(dirname(currentFile), '../dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (request, response, next) => {
    if (request.path.startsWith('/api')) return next()
    response.sendFile(resolve(distDir, 'index.html'))
  })
}

const start = async () => {
  await ensureSchema()
  await initializeDatabase(pool)
  app.listen(config.apiPort, () => {
    console.log(`Sovereign Analytics API listening on http://localhost:${config.apiPort}`)
  })

  if (config.fxSyncIntervalMinutes > 0) {
    setInterval(() => {
      void syncLatestFx(pool, referencePairs).catch((error) => {
        console.error('Scheduled FX sync failed:', error)
      })
    }, config.fxSyncIntervalMinutes * 60 * 1000).unref()
  }

  if (config.newsSyncIntervalMinutes > 0) {
    setInterval(() => {
      void syncNewsAndEvents(pool, referencePairs).catch((error) => {
        console.error('Scheduled news sync failed:', error)
      })
    }, config.newsSyncIntervalMinutes * 60 * 1000).unref()
  }

  if (config.forecastSyncIntervalMinutes > 0) {
    setInterval(() => {
      void syncForecasts(pool, referencePairs).catch((error) => {
        console.error('Scheduled forecast sync failed:', error)
      })
    }, config.forecastSyncIntervalMinutes * 60 * 1000).unref()
  }
}

void start()
