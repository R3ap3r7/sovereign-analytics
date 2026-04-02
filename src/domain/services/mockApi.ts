import { calculateTradeOutputs } from '../calculators'
import {
  mutationStorageApi,
  onboardingStorageApi,
  sessionStorageApi,
  settingsStorageApi,
  storage,
  visitedStorageApi,
} from '../persistence'
import { seedData } from '../seed/data'
import {
  addRecentVisit,
  buildDashboardSnapshot,
  buildNotifications,
  buildSearchIndex,
  evaluateAlertStatus,
  getCurrencyWorkspace,
  getEventWorkspace,
  getPairWorkspace,
  getUserAlerts,
  getUserNotes,
  getUserPortfolioWorkspace,
  getUserWatchlist,
  recalculatePortfolio,
} from '../selectors'
import type {
  AdminMarketMutation,
  AlertRule,
  Note,
  PortfolioJournal,
  PortfolioOrder,
  PortfolioPosition,
  Settings,
  Simulation,
  User,
  VisitRecord,
  WatchEntityType,
  WatchlistItem,
} from '../types'
import { delay } from '../../lib/utils'

type RuntimeMutations = {
  simulations: Simulation[]
  notes: Note[]
  watchlist: WatchlistItem[]
  alerts: AlertRule[]
  portfolios: typeof seedData.portfolios
  positions: PortfolioPosition[]
  orders: PortfolioOrder[]
  journals: PortfolioJournal[]
}

const defaultAdminMutation: AdminMarketMutation = {
  currencyShifts: {},
  pairVolatilityShifts: {},
  newsToneShifts: {},
  triggeredEventIds: [],
}

const readRuntime = (): RuntimeMutations => {
  const portfolio = storage.get<Pick<RuntimeMutations, 'portfolios' | 'positions' | 'orders' | 'journals'>>(
    'portfolio',
    {
      portfolios: seedData.portfolios,
      positions: seedData.positions,
      orders: seedData.orders,
      journals: seedData.journals,
    },
  )

  return {
    simulations: storage.get<Simulation[]>('simulations', seedData.simulations),
    notes: storage.get<Note[]>('notes', seedData.notes),
    watchlist: storage.get<WatchlistItem[]>('watchlist', seedData.watchlist),
    alerts: storage.get<AlertRule[]>('alerts', seedData.alerts),
    ...portfolio,
  }
}

const writeRuntime = (runtime: RuntimeMutations) => {
  storage.set('simulations', runtime.simulations)
  storage.set('notes', runtime.notes)
  storage.set('watchlist', runtime.watchlist)
  storage.set('alerts', runtime.alerts)
  storage.set('portfolio', {
    portfolios: runtime.portfolios,
    positions: runtime.positions,
    orders: runtime.orders,
    journals: runtime.journals,
  })
}

const defaultNewUserSettings = (): Settings => ({
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
})

const applyOnboardingToUser = (user: User) => {
  const onboardingMap = onboardingStorageApi.read()
  const record = onboardingMap[user.id]
  if (!record || typeof record === 'boolean') {
    return {
      ...user,
      onboardingCompleted: typeof record === 'boolean' ? record : user.onboardingCompleted,
    }
  }

  return {
    ...user,
    ...record.updates,
    onboardingCompleted: record.completed,
  }
}

const createFallbackPortfolioForSignup = (userId: string) => ({
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
})

const evaluateRuntimeAlerts = (alerts: AlertRule[], mutation: AdminMarketMutation) =>
  alerts.map((alert) => evaluateAlertStatus(alert, { ...seedData, ...readRuntime(), users: seedData.users }, mutation))

export const getSeed = () => {
  const runtime = readRuntime()
  const mutation = mutationStorageApi.readAdminMutation()
  const settingsMap = settingsStorageApi.read()
  const users = seedData.users.map((user) => {
    const withSettings = {
      ...user,
      settings: settingsMap[user.id] ?? user.settings,
    }
    return applyOnboardingToUser(withSettings)
  })

  return {
    ...seedData,
    users,
    simulations: runtime.simulations,
    notes: runtime.notes,
    watchlist: runtime.watchlist,
    alerts: evaluateRuntimeAlerts(runtime.alerts, mutation),
    portfolios: runtime.portfolios,
    positions: runtime.positions,
    orders: runtime.orders,
    journals: runtime.journals,
  }
}

const createSession = (userId: string, intendedPath?: string, mock2FARequired = false) => ({
  userId,
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  intendedPath,
  mock2FARequired,
})

const getActiveUser = () => {
  const session = sessionStorageApi.read()
  if (!session) return null
  if (Date.parse(session.expiresAt) < Date.now()) {
    sessionStorageApi.write(null)
    return null
  }
  return getSeed().users.find((item) => item.id === session.userId) ?? null
}

const getEntityHref = (entityType: WatchEntityType | 'simulation' | 'strategy', entityId: string) => {
  if (entityType === 'pair') return `/app/markets/${entityId}`
  if (entityType === 'currency') return `/app/currencies/${entityId}`
  if (entityType === 'event') return `/app/events/${entityId}`
  if (entityType === 'simulation') return `/app/simulation?simulation=${entityId}`
  if (entityType === 'strategy') return '/app/strategies'
  return '/app/forecast'
}

const cloneRuntime = () => ({ ...readRuntime() })

const persistVisited = (key: keyof VisitRecord, value: string) => {
  const visited = visitedStorageApi.read()
  visitedStorageApi.write({
    ...visited,
    [key]: addRecentVisit(visited[key], value),
  })
}

export const authApi = {
  async login(email: string, password: string, intendedPath?: string) {
    const seed = getSeed()
    const user = seed.users.find((item) => item.email === email)
    await delay(null, 320)
    if (!user || user.password !== password) throw new Error('Invalid demo credentials.')
    if (user.locked) throw new Error('This demo persona is locked to test auth edge cases.')
    if (!user.verified || user.status === 'unverified') {
      sessionStorageApi.write(createSession(user.id, intendedPath, true))
      return { user, requiresVerification: true }
    }
    sessionStorageApi.write(createSession(user.id, intendedPath, Boolean(user.settings.mock2FAEnabled)))
    return { user, requiresVerification: Boolean(user.settings.mock2FAEnabled) }
  },
  async verifyOtp() {
    const session = sessionStorageApi.read()
    if (!session) throw new Error('No verification session found.')
    sessionStorageApi.write({ ...session, mock2FARequired: false })
    return delay(true, 180)
  },
  async logout() {
    sessionStorageApi.write(null)
    await delay(true, 120)
  },
  async signup(input: { displayName: string; email: string; password: string }) {
    const userId = `user-${input.email.replace(/[^a-z]/gi, '').toLowerCase()}`
    const settings = defaultNewUserSettings()
    const onboardingMap = onboardingStorageApi.read()
    onboardingMap[userId] = {
      completed: false,
      updates: {
        experienceLevel: 'beginner',
        riskProfile: 'conservative',
        analysisFocus: 'macro',
        favoriteCurrencies: ['USD'],
        favoritePairs: ['eur-usd'],
        dashboardPreset: 'compact',
        defaultAccountCurrency: 'USD',
        verified: false,
      },
    }
    onboardingStorageApi.write(onboardingMap)

    const runtime = cloneRuntime()
    runtime.portfolios = [...runtime.portfolios, createFallbackPortfolioForSignup(userId)]
    writeRuntime(runtime)

    const map = settingsStorageApi.read()
    map[userId] = settings
    settingsStorageApi.write(map)
    sessionStorageApi.write(createSession(userId, undefined, true))
    const user: User = {
      id: userId,
      role: 'user',
      status: 'unverified',
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      avatarSeed: input.displayName.toLowerCase(),
      experienceLevel: 'beginner',
      riskProfile: 'conservative',
      analysisFocus: 'macro',
      defaultAccountCurrency: 'USD',
      favoriteCurrencies: ['USD'],
      favoritePairs: ['eur-usd'],
      dashboardPreset: 'compact',
      settings,
      watchlistIds: [],
      alertIds: [],
      noteIds: [],
      portfolioId: `portfolio-${userId}`,
      savedSimulationIds: [],
      onboardingCompleted: false,
      verified: false,
      locked: false,
    }
    return delay(user, 200)
  },
}

export const appApi = {
  getCurrentSession() {
    return sessionStorageApi.read()
  },
  getCurrentUser() {
    return getActiveUser()
  },
  async getCurrentUserWorkspace() {
    const seed = getSeed()
    const user = this.getCurrentUser()
    const mutation = mutationStorageApi.readAdminMutation()
    return delay(
      {
        user,
        dashboard: user ? buildDashboardSnapshot(seed, user, mutation) : null,
        alerts: getUserAlerts(seed, user),
        watchlist: getUserWatchlist(seed, user),
        notifications: buildNotifications(seed, user, mutation),
        visited: visitedStorageApi.read(),
      },
      240,
    )
  },
  async listUsers() {
    return delay(getSeed().users, 140)
  },
  async listPairs() {
    return delay(getSeed().pairs, 220)
  },
  async getPairWorkspace(pairId: string) {
    const seed = getSeed()
    return delay(getPairWorkspace(seed, pairId, this.getCurrentUser(), mutationStorageApi.readAdminMutation()), 260)
  },
  async listCurrencies() {
    return delay(getSeed().currencies, 180)
  },
  async getCurrencyWorkspace(code: string) {
    const seed = getSeed()
    return delay(getCurrencyWorkspace(seed, code, this.getCurrentUser(), mutationStorageApi.readAdminMutation()), 240)
  },
  async listEvents() {
    return delay(getSeed().events, 180)
  },
  async getEventWorkspace(id: string) {
    return delay(getEventWorkspace(getSeed(), id), 240)
  },
  async listNews() {
    return delay(getSeed().news, 160)
  },
  async listForecasts() {
    return delay(getSeed().forecasts, 180)
  },
  async listStrategies() {
    return delay(getSeed().strategies, 180)
  },
  async getPortfolioWorkspace() {
    return delay(getUserPortfolioWorkspace(getSeed(), this.getCurrentUser()), 90)
  },
  async listWatchlistItems() {
    return delay(getUserWatchlist(getSeed(), this.getCurrentUser()), 150)
  },
  async listAlerts() {
    return delay(getUserAlerts(getSeed(), this.getCurrentUser()), 150)
  },
  async listNotes() {
    return delay(getUserNotes(getSeed(), this.getCurrentUser()), 150)
  },
  async searchEntities(query: string) {
    const seed = getSeed()
    const results = buildSearchIndex(seed, this.getCurrentUser()).filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    )
    return delay(results.slice(0, 10), 120)
  },
  async saveSettings(settings: Settings) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const map = settingsStorageApi.read()
    map[user.id] = settings
    settingsStorageApi.write(map)
    return delay(settings, 100)
  },
  async completeOnboarding(update: Partial<User>) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const settings = {
      ...user.settings,
      favoriteCurrencies: update.favoriteCurrencies ?? user.favoriteCurrencies,
      favoritePairs: update.favoritePairs ?? user.favoritePairs,
      dashboardMode: update.dashboardPreset ?? user.dashboardPreset,
      defaultAccountCurrency: update.defaultAccountCurrency ?? user.defaultAccountCurrency,
    }
    const map = settingsStorageApi.read()
    map[user.id] = settings
    settingsStorageApi.write(map)
    const onboarding = onboardingStorageApi.read()
    onboarding[user.id] = {
      completed: true,
      updates: update,
    }
    onboardingStorageApi.write(onboarding)
    return delay(true, 120)
  },
  async resetOnboarding() {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const onboarding = onboardingStorageApi.read()
    onboarding[user.id] = { completed: false, updates: {} }
    onboardingStorageApi.write(onboarding)
    return delay(true, 120)
  },
  async switchPersona(userId: string) {
    const user = getSeed().users.find((item) => item.id === userId)
    if (!user) throw new Error('Persona not found')
    sessionStorageApi.write(createSession(user.id, '/app/dashboard', Boolean(user.settings.mock2FAEnabled && user.verified)))
    return delay(user, 120)
  },
  async saveSimulation(simulation: Simulation) {
    const runtime = cloneRuntime()
    const existingIndex = runtime.simulations.findIndex((item) => item.id === simulation.id)
    const next = { ...simulation, outputs: simulation.outputs, updatedAt: new Date().toISOString() }
    if (existingIndex >= 0) runtime.simulations[existingIndex] = next
    else runtime.simulations.push(next)
    writeRuntime(runtime)
    return delay(next, 120)
  },
  async duplicateSimulation(id: string) {
    const runtime = cloneRuntime()
    const existing = runtime.simulations.find((item) => item.id === id)
    if (!existing) throw new Error('Simulation not found')
    const duplicate = {
      ...existing,
      id: `${id}-copy-${Date.now()}`,
      sourceContext: 'saved' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    runtime.simulations.push(duplicate)
    writeRuntime(runtime)
    return delay(duplicate, 120)
  },
  async toggleWatchlist(entityType: WatchEntityType, entityId: string, priority: WatchlistItem['priority'] = 'medium') {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const existing = runtime.watchlist.find(
      (item) => item.userId === user.id && item.entityType === entityType && item.entityId === entityId,
    )
    runtime.watchlist = existing
      ? runtime.watchlist.filter((item) => item.id !== existing.id)
      : [
          {
            id: `watch-${Date.now()}`,
            userId: user.id,
            entityType,
            entityId,
            createdAt: new Date().toISOString(),
            priority,
          },
          ...runtime.watchlist,
        ]
    writeRuntime(runtime)
    return delay(runtime.watchlist.filter((item) => item.userId === user.id), 120)
  },
  async upsertWatchlist(entityType: WatchEntityType, entityId: string, priority: WatchlistItem['priority'] = 'medium') {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const existingIndex = runtime.watchlist.findIndex(
      (item) => item.userId === user.id && item.entityType === entityType && item.entityId === entityId,
    )
    const nextItem: WatchlistItem = {
      id: existingIndex >= 0 ? runtime.watchlist[existingIndex].id : `watch-${Date.now()}`,
      userId: user.id,
      entityType,
      entityId,
      createdAt: existingIndex >= 0 ? runtime.watchlist[existingIndex].createdAt : new Date().toISOString(),
      priority,
    }
    if (existingIndex >= 0) runtime.watchlist[existingIndex] = nextItem
    else runtime.watchlist = [nextItem, ...runtime.watchlist]
    writeRuntime(runtime)
    return delay(runtime.watchlist.filter((item) => item.userId === user.id), 120)
  },
  async createAlert(input: Omit<AlertRule, 'id' | 'createdAt' | 'lastEvaluation' | 'status' | 'userId'>) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const alert: AlertRule = {
      ...input,
      id: `alert-${Date.now()}`,
      userId: user.id,
      createdAt: new Date().toISOString(),
      lastEvaluation: new Date().toISOString(),
      status: 'active',
    }
    runtime.alerts = [alert, ...runtime.alerts]
    writeRuntime(runtime)
    return delay(alert, 120)
  },
  async updateAlert(alertId: string, patch: Partial<AlertRule>) {
    const runtime = cloneRuntime()
    runtime.alerts = runtime.alerts.map((item) =>
      item.id === alertId ? { ...item, ...patch, lastEvaluation: new Date().toISOString() } : item,
    )
    writeRuntime(runtime)
    return delay(runtime.alerts.find((item) => item.id === alertId)!, 120)
  },
  async dismissAlert(alertId: string) {
    const runtime = cloneRuntime()
    runtime.alerts = runtime.alerts.filter((item) => item.id !== alertId)
    writeRuntime(runtime)
    return delay(true, 120)
  },
  async createNote(note: Note) {
    const runtime = cloneRuntime()
    runtime.notes.unshift(note)
    writeRuntime(runtime)
    return delay(note, 120)
  },
  async updateNote(note: Note) {
    const runtime = cloneRuntime()
    runtime.notes = runtime.notes.map((item) => (item.id === note.id ? note : item))
    writeRuntime(runtime)
    return delay(note, 120)
  },
  async pinNote(noteId: string, pinned: boolean) {
    const runtime = cloneRuntime()
    runtime.notes = runtime.notes.map((item) => (item.id === noteId ? { ...item, pinned } : item))
    writeRuntime(runtime)
    return delay(runtime.notes.find((item) => item.id === noteId)!, 120)
  },
  async applyAdminMutation(mutation: AdminMarketMutation) {
    mutationStorageApi.writeAdminMutation(mutation)
    return delay(mutation, 120)
  },
  async resetAdminMutation() {
    mutationStorageApi.writeAdminMutation(defaultAdminMutation)
    return delay(true, 120)
  },
  async resetDemoState() {
    storage.remove('simulations')
    storage.remove('notes')
    storage.remove('watchlist')
    storage.remove('alerts')
    storage.remove('portfolio')
    storage.remove('visited')
    mutationStorageApi.writeAdminMutation(defaultAdminMutation)
    return delay(true, 120)
  },
  async openPaperTrade(simulation: Simulation) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const pair = getSeed().pairs.find((item) => item.id === simulation.pairId)!
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
      unrealizedPnL: calculateTradeOutputs({
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
      }).netPnL,
      leverage: simulation.leverage,
    }
    runtime.positions = [position, ...runtime.positions]
    runtime.orders = [
      {
        id: `ord-${Date.now()}`,
        pairId: position.pairId,
        action: 'open',
        timestamp: new Date().toISOString(),
        detail: `Opened from simulation ${simulation.id}.`,
      },
      ...runtime.orders,
    ]
    runtime.portfolios = runtime.portfolios.map((portfolio) =>
      portfolio.userId === user.id
        ? {
            ...portfolio,
            openPositionIds: [position.id, ...portfolio.openPositionIds],
            orderIds: [runtime.orders[0].id, ...portfolio.orderIds],
          }
        : portfolio,
    )
    writeRuntime(runtime)
    return delay(position, 140)
  },
  async closePaperTrade(positionId: string) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const position = runtime.positions.find((item) => item.id === positionId)
    if (!position) throw new Error('Position not found')
    const closedPosition = {
      ...position,
      status: 'closed' as const,
      closedAt: new Date().toISOString(),
      realizedPnL: position.unrealizedPnL,
      unrealizedPnL: 0,
    }
    runtime.positions = runtime.positions.map((item) => (item.id === positionId ? closedPosition : item))
    const closeOrder = {
      id: `ord-${Date.now()}`,
      pairId: position.pairId,
      action: 'close' as const,
      timestamp: new Date().toISOString(),
      detail: 'Position closed from portfolio workspace.',
    }
    runtime.orders = [closeOrder, ...runtime.orders]
    runtime.portfolios = runtime.portfolios.map((portfolio) =>
      portfolio.userId === user.id
        ? {
            ...portfolio,
            openPositionIds: portfolio.openPositionIds.filter((id) => id !== positionId),
            closedPositionIds: [positionId, ...portfolio.closedPositionIds],
            orderIds: [closeOrder.id, ...portfolio.orderIds],
          }
        : portfolio,
    )
    writeRuntime(runtime)
    return delay(closedPosition, 120)
  },
  async updatePaperTrade(positionId: string, patch: Partial<PortfolioPosition>) {
    const runtime = cloneRuntime()
    runtime.positions = runtime.positions.map((item) => (item.id === positionId ? { ...item, ...patch } : item))
    const updated = runtime.positions.find((item) => item.id === positionId)!
    const modifyOrder = {
      id: `ord-${Date.now()}`,
      pairId: updated.pairId,
      action: 'modify' as const,
      timestamp: new Date().toISOString(),
      detail: 'Trade risk parameters were updated.',
    }
    runtime.orders = [modifyOrder, ...runtime.orders]
    runtime.portfolios = runtime.portfolios.map((portfolio) =>
      portfolio.openPositionIds.includes(positionId)
        ? { ...portfolio, orderIds: [modifyOrder.id, ...portfolio.orderIds] }
        : portfolio,
    )
    writeRuntime(runtime)
    return delay(updated, 120)
  },
  async addJournalEntry(input: { title: string; body: string; pairId?: string }) {
    const user = this.getCurrentUser()
    if (!user) throw new Error('No active user')
    const runtime = cloneRuntime()
    const journal: PortfolioJournal = {
      id: `jr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...input,
    }
    runtime.journals = [journal, ...runtime.journals]
    runtime.portfolios = runtime.portfolios.map((portfolio) =>
      portfolio.userId === user.id
        ? { ...portfolio, journalIds: [journal.id, ...portfolio.journalIds] }
        : portfolio,
    )
    writeRuntime(runtime)
    return delay(journal, 120)
  },
  saveVisited(type: keyof VisitRecord, value: string) {
    persistVisited(type, value)
  },
  getVisited() {
    return visitedStorageApi.read()
  },
  buildSimulationFromPair(pairId: string, direction: 'long' | 'short' = 'long'): Simulation {
    const seed = getSeed()
    const user = this.getCurrentUser()
    const pair = seed.pairs.find((item) => item.id === pairId)!
    const latest = seed.priceSeries.find((item) => item.pairId === pairId && item.timeframe === '1D')!.points.at(-1)!.value
    const stopLoss = direction === 'long' ? latest - 20 * pair.pipPrecision : latest + 20 * pair.pipPrecision
    const takeProfit = direction === 'long' ? latest + 45 * pair.pipPrecision : latest - 45 * pair.pipPrecision
    const exit = direction === 'long' ? latest + 15 * pair.pipPrecision : latest - 15 * pair.pipPrecision
    return {
      id: `sim-live-${Date.now()}`,
      userId: user?.id ?? 'guest',
      pairId,
      sourceContext: 'pair',
      accountCurrency: user?.settings.defaultAccountCurrency ?? 'USD',
      capital: 25000,
      direction,
      entry: latest,
      exit,
      stopLoss,
      takeProfit,
      leverage: 5,
      positionSize: 60000,
      lotSize: 0.6,
      spread: pair.spreadEstimate,
      fees: 14,
      holdingDuration: '2 days',
      conviction: 60,
      scenarioType: 'pair quick launch',
      outputs: calculateTradeOutputs({
        symbol: pair.symbol,
        direction,
        capital: 25000,
        leverage: 5,
        entry: latest,
        exit,
        stopLoss,
        takeProfit,
        positionSize: 60000,
        spread: pair.spreadEstimate,
        fees: 14,
      }),
      linkedNoteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  getEntityHref,
  recalculatePortfolio(accountId: string) {
    const seed = getSeed()
    const portfolio = seed.portfolios.find((item) => item.id === accountId)
    if (!portfolio) return null
    return recalculatePortfolio(
      portfolio,
      seed.positions.filter((item) => portfolio.openPositionIds.includes(item.id)),
      seed.positions.filter((item) => portfolio.closedPositionIds.includes(item.id)),
    )
  },
}
