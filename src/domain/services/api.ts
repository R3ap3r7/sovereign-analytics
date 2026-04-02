import { calculateTradeOutputs } from '../calculators'
import {
  addRecentVisit,
  buildDashboardSnapshot,
  buildNotifications,
  buildSearchIndex,
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
  PortfolioPosition,
  SeedData,
  Session,
  Settings,
  Simulation,
  User,
  VisitRecord,
  WatchEntityType,
  WatchlistItem,
} from '../types'

type BootstrapResponse = {
  seed: SeedData
  currentUser: User | null
  session: Session | null
  visited: VisitRecord
  adminMutation: AdminMarketMutation
}

const apiFetch = async <T>(input: string, init?: RequestInit) => {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Request failed: ${response.status}`)
  }
  if (response.status === 204) return null as T
  return (await response.json()) as T
}

const cache: BootstrapResponse = {
  seed: {
    users: [],
    currencies: [],
    pairs: [],
    priceSeries: [],
    technicals: [],
    events: [],
    news: [],
    forecasts: [],
    strategies: [],
    scenarios: [],
    simulations: [],
    portfolios: [],
    positions: [],
    orders: [],
    journals: [],
    watchlist: [],
    alerts: [],
    notes: [],
  },
  currentUser: null,
  session: null,
  visited: { pairs: [], currencies: [], events: [] },
  adminMutation: {
    currencyShifts: {},
    pairVolatilityShifts: {},
    newsToneShifts: {},
    triggeredEventIds: [],
  },
}

let hydrated = false

const setBootstrap = (payload: BootstrapResponse) => {
  cache.seed = payload.seed
  cache.currentUser = payload.currentUser
  cache.session = payload.session
  cache.visited = payload.visited
  cache.adminMutation = payload.adminMutation
  hydrated = true
}

const ensureBootstrap = async () => {
  if (hydrated) return cache
  const payload = await apiFetch<BootstrapResponse>('/api/bootstrap')
  setBootstrap(payload)
  return cache
}

const refreshBootstrap = async () => {
  const payload = await apiFetch<BootstrapResponse>('/api/bootstrap')
  setBootstrap(payload)
  return cache
}

const getCurrentPrice = (pairId: string) =>
  cache.seed.priceSeries.find((item) => item.pairId === pairId && item.timeframe === '1D')?.points.at(-1)?.value ?? 0

export const authApi = {
  async login(email: string, password: string, intendedPath?: string) {
    const result = await apiFetch<{ requiresVerification: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, intendedPath }),
    })
    await refreshBootstrap()
    return result
  },
  async verifyOtp() {
    await apiFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return true
  },
  async logout() {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return true
  },
  async signup(input: { displayName: string; email: string; password: string }) {
    await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    await refreshBootstrap()
    return cache.currentUser
  },
}

export const appApi = {
  async hydrate() {
    await refreshBootstrap()
  },
  getCurrentSession() {
    return cache.session
  },
  getCurrentUser() {
    return cache.currentUser
  },
  getAdminMutation() {
    return cache.adminMutation
  },
  async getCurrentUserWorkspace() {
    await ensureBootstrap()
    const user = cache.currentUser
    return {
      user,
      dashboard: user ? buildDashboardSnapshot(cache.seed, user, cache.adminMutation) : null,
      alerts: getUserAlerts(cache.seed, user),
      watchlist: getUserWatchlist(cache.seed, user),
      notifications: buildNotifications(cache.seed, user, cache.adminMutation),
      visited: cache.visited,
    }
  },
  async listUsers() {
    await ensureBootstrap()
    return cache.seed.users
  },
  async listPairs() {
    await ensureBootstrap()
    return cache.seed.pairs
  },
  async getPairWorkspace(pairId: string) {
    await ensureBootstrap()
    return getPairWorkspace(cache.seed, pairId, cache.currentUser, cache.adminMutation)
  },
  async listCurrencies() {
    await ensureBootstrap()
    return cache.seed.currencies
  },
  async getCurrencyWorkspace(code: string) {
    await ensureBootstrap()
    return getCurrencyWorkspace(cache.seed, code, cache.currentUser, cache.adminMutation)
  },
  async listEvents() {
    await ensureBootstrap()
    return cache.seed.events
  },
  async getEventWorkspace(id: string) {
    await ensureBootstrap()
    return getEventWorkspace(cache.seed, id)
  },
  async listNews() {
    await ensureBootstrap()
    return cache.seed.news
  },
  async listForecasts() {
    await ensureBootstrap()
    return cache.seed.forecasts
  },
  async listStrategies() {
    await ensureBootstrap()
    return cache.seed.strategies
  },
  async getPortfolioWorkspace() {
    await ensureBootstrap()
    return getUserPortfolioWorkspace(cache.seed, cache.currentUser)
  },
  async listWatchlistItems() {
    await ensureBootstrap()
    return getUserWatchlist(cache.seed, cache.currentUser)
  },
  async listAlerts() {
    await ensureBootstrap()
    return getUserAlerts(cache.seed, cache.currentUser)
  },
  async listNotes() {
    await ensureBootstrap()
    return getUserNotes(cache.seed, cache.currentUser)
  },
  async searchEntities(query: string) {
    await ensureBootstrap()
    return buildSearchIndex(cache.seed, cache.currentUser)
      .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
  },
  async saveSettings(settings: Settings) {
    await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
    await refreshBootstrap()
    return settings
  },
  async completeOnboarding(update: Partial<User>) {
    await apiFetch('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(update),
    })
    await refreshBootstrap()
    return true
  },
  async resetOnboarding() {
    await apiFetch('/api/onboarding/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return true
  },
  async switchPersona(userId: string) {
    await apiFetch('/api/persona/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
    await refreshBootstrap()
    return cache.currentUser
  },
  async saveSimulation(simulation: Simulation) {
    await apiFetch('/api/simulations/save', {
      method: 'POST',
      body: JSON.stringify(simulation),
    })
    await refreshBootstrap()
    return simulation
  },
  async duplicateSimulation(id: string) {
    const duplicate = await apiFetch<Simulation>(`/api/simulations/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return duplicate
  },
  async toggleWatchlist(entityType: WatchEntityType, entityId: string, priority: WatchlistItem['priority'] = 'medium') {
    await apiFetch('/api/watchlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, priority }),
    })
    await refreshBootstrap()
    return getUserWatchlist(cache.seed, cache.currentUser)
  },
  async upsertWatchlist(entityType: WatchEntityType, entityId: string, priority: WatchlistItem['priority'] = 'medium') {
    await apiFetch('/api/watchlist/upsert', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, priority }),
    })
    await refreshBootstrap()
    return getUserWatchlist(cache.seed, cache.currentUser)
  },
  async createAlert(input: Omit<AlertRule, 'id' | 'createdAt' | 'lastEvaluation' | 'status' | 'userId'>) {
    const alert = await apiFetch<AlertRule>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    await refreshBootstrap()
    return alert
  },
  async updateAlert(alertId: string, patch: Partial<AlertRule>) {
    const alert = await apiFetch<AlertRule>(`/api/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    await refreshBootstrap()
    return alert
  },
  async dismissAlert(alertId: string) {
    await apiFetch(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    })
    await refreshBootstrap()
    return true
  },
  async createNote(note: Note) {
    const created = await apiFetch<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    })
    await refreshBootstrap()
    return created
  },
  async updateNote(note: Note) {
    const updated = await apiFetch<Note>(`/api/notes/${note.id}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    })
    await refreshBootstrap()
    return updated
  },
  async pinNote(noteId: string, pinned: boolean) {
    const updated = await apiFetch<Note>(`/api/notes/${noteId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    })
    await refreshBootstrap()
    return updated
  },
  async applyAdminMutation(mutation: AdminMarketMutation) {
    await apiFetch('/api/admin/mutation', {
      method: 'POST',
      body: JSON.stringify(mutation),
    })
    await refreshBootstrap()
    return mutation
  },
  async resetAdminMutation() {
    await apiFetch('/api/admin/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return true
  },
  async resetDemoState() {
    await apiFetch('/api/demo/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return true
  },
  async openPaperTrade(simulation: Simulation) {
    const position = await apiFetch<PortfolioPosition>('/api/portfolio/open', {
      method: 'POST',
      body: JSON.stringify(simulation),
    })
    await refreshBootstrap()
    return position
  },
  async closePaperTrade(positionId: string) {
    const closed = await apiFetch<PortfolioPosition>(`/api/portfolio/close/${positionId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    await refreshBootstrap()
    return closed
  },
  async updatePaperTrade(positionId: string, patch: Partial<PortfolioPosition>) {
    const updated = await apiFetch<PortfolioPosition>(`/api/portfolio/${positionId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    await refreshBootstrap()
    return updated
  },
  async addJournalEntry(input: { title: string; body: string; pairId?: string }) {
    const journal = await apiFetch<PortfolioJournal>('/api/portfolio/journal', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    await refreshBootstrap()
    return journal
  },
  async saveVisited(type: keyof VisitRecord, value: string) {
    await apiFetch('/api/visited', {
      method: 'POST',
      body: JSON.stringify({ type, value }),
    })
    cache.visited = {
      ...cache.visited,
      [type]: addRecentVisit(cache.visited[type], value),
    }
  },
  getVisited() {
    return cache.visited
  },
  buildSimulationFromPair(pairId: string, direction: 'long' | 'short' = 'long'): Simulation {
    const pair = cache.seed.pairs.find((item) => item.id === pairId)
    const user = cache.currentUser
    if (!pair) throw new Error(`Unknown pair: ${pairId}`)
    const latest = getCurrentPrice(pairId)
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
  getEntityHref(entityType: WatchEntityType | 'simulation' | 'strategy', entityId: string) {
    if (entityType === 'pair') return `/app/markets/${entityId}`
    if (entityType === 'currency') return `/app/currencies/${entityId}`
    if (entityType === 'event') return `/app/events/${entityId}`
    if (entityType === 'simulation') return `/app/simulation?simulation=${entityId}`
    if (entityType === 'strategy') return '/app/strategies'
    return '/app/forecast'
  },
  recalculatePortfolio(accountId: string) {
    const portfolio = cache.seed.portfolios.find((item) => item.id === accountId)
    if (!portfolio) return null
    return recalculatePortfolio(
      portfolio,
      cache.seed.positions.filter((item) => portfolio.openPositionIds.includes(item.id)),
      cache.seed.positions.filter((item) => portfolio.closedPositionIds.includes(item.id)),
    )
  },
}

export const getSeed = () => cache.seed
