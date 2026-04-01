import { calculateTradeOutputs } from '../calculators'
import { mutationStorageApi, sessionStorageApi, settingsStorageApi, storage } from '../persistence'
import { seedData } from '../seed/data'
import { buildDashboardSnapshot, buildSearchIndex, evaluateAlertStatus, getCurrencyWorkspace, getEventWorkspace, getPairWorkspace, getUserAlerts, getUserNotes, getUserPortfolioWorkspace, getUserWatchlist } from '../selectors'
import type { AdminMarketMutation, Note, Session, Settings, Simulation, User } from '../types'
import { delay } from '../../lib/utils'

type RuntimeMutations = {
  simulations: Simulation[]
  notes: Note[]
}

const readRuntime = (): RuntimeMutations => ({
  simulations: storage.get<Simulation[]>('simulations', seedData.simulations),
  notes: storage.get<Note[]>('notes', seedData.notes),
})

const writeRuntime = (runtime: RuntimeMutations) => {
  storage.set('simulations', runtime.simulations)
  storage.set('notes', runtime.notes)
}

export const getSeed = () => {
  const runtime = readRuntime()
  const mutation = mutationStorageApi.readAdminMutation()
  const settingsMap = settingsStorageApi.read()
  const users = seedData.users.map((user) => ({
    ...user,
    settings: settingsMap[user.id] ?? user.settings,
  }))
  return {
    ...seedData,
    users,
    simulations: runtime.simulations,
    notes: runtime.notes,
    alerts: seedData.alerts.map((alert) => evaluateAlertStatus(alert, seedData, mutation)),
  }
}

export const authApi = {
  async login(email: string, password: string, intendedPath?: string) {
    const seed = getSeed()
    const user = seed.users.find((item) => item.email === email)
    await delay(null, 320)
    if (!user || user.password !== password) throw new Error('Invalid demo credentials.')
    if (user.locked) throw new Error('This demo persona is locked to test auth edge cases.')
    if (!user.verified) {
      const session: Session = { userId: user.id, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), intendedPath, mock2FARequired: true }
      sessionStorageApi.write(session)
      return { user, requiresVerification: true }
    }
    const session: Session = { userId: user.id, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), intendedPath, mock2FARequired: Boolean(user.settings.mock2FAEnabled) }
    sessionStorageApi.write(session)
    return { user, requiresVerification: user.settings.mock2FAEnabled }
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
    const settings = defaultNewUserSettings()
    const user: User = {
      id: `user-${input.email.replace(/[^a-z]/gi, '').toLowerCase()}`,
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
      portfolioId: 'portfolio-unverified',
      savedSimulationIds: [],
      onboardingCompleted: false,
      verified: false,
      locked: false,
    }
    const seed = getSeed()
    seed.users.push(user)
    sessionStorageApi.write({ userId: user.id, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), mock2FARequired: true })
    return delay(user, 200)
  },
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
})

export const appApi = {
  getCurrentSession() {
    return sessionStorageApi.read()
  },
  getCurrentUser() {
    const session = sessionStorageApi.read()
    if (!session) return null
    if (Date.parse(session.expiresAt) < Date.now()) {
      sessionStorageApi.write(null)
      return null
    }
    return getSeed().users.find((item) => item.id === session.userId) ?? null
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
      },
      240,
    )
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
    return delay(getUserPortfolioWorkspace(getSeed(), this.getCurrentUser()), 220)
  },
  async listWatchlistItems() {
    return delay(getUserWatchlist(getSeed(), this.getCurrentUser()), 150)
  },
  async listNotes() {
    return delay(getUserNotes(getSeed(), this.getCurrentUser()), 150)
  },
  async searchEntities(query: string) {
    const seed = getSeed()
    const results = buildSearchIndex(seed, this.getCurrentUser()).filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
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
    const settings = { ...user.settings, favoriteCurrencies: update.favoriteCurrencies ?? user.favoriteCurrencies, favoritePairs: update.favoritePairs ?? user.favoritePairs, dashboardMode: update.dashboardPreset ?? user.dashboardPreset, defaultAccountCurrency: update.defaultAccountCurrency ?? user.defaultAccountCurrency }
    const map = settingsStorageApi.read()
    map[user.id] = settings
    settingsStorageApi.write(map)
    storage.set('onboarding', { [user.id]: true })
    return delay(true, 120)
  },
  async saveSimulation(simulation: Simulation) {
    const runtime = readRuntime()
    const existingIndex = runtime.simulations.findIndex((item) => item.id === simulation.id)
    if (existingIndex >= 0) runtime.simulations[existingIndex] = simulation
    else runtime.simulations.push(simulation)
    writeRuntime(runtime)
    return delay(simulation, 120)
  },
  async duplicateSimulation(id: string) {
    const runtime = readRuntime()
    const existing = runtime.simulations.find((item) => item.id === id)
    if (!existing) throw new Error('Simulation not found')
    const duplicate = { ...existing, id: `${id}-copy-${Date.now()}`, sourceContext: 'saved' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    runtime.simulations.push(duplicate)
    writeRuntime(runtime)
    return delay(duplicate, 120)
  },
  async createNote(note: Note) {
    const runtime = readRuntime()
    runtime.notes.unshift(note)
    writeRuntime(runtime)
    return delay(note, 120)
  },
  async updateNote(note: Note) {
    const runtime = readRuntime()
    runtime.notes = runtime.notes.map((item) => (item.id === note.id ? note : item))
    writeRuntime(runtime)
    return delay(note, 120)
  },
  async applyAdminMutation(mutation: AdminMarketMutation) {
    mutationStorageApi.writeAdminMutation(mutation)
    return delay(mutation, 120)
  },
  async resetDemoState() {
    storage.remove('simulations')
    storage.remove('notes')
    mutationStorageApi.writeAdminMutation({ currencyShifts: {}, pairVolatilityShifts: {}, newsToneShifts: {}, triggeredEventIds: [] })
    return delay(true, 120)
  },
  async openPaperTrade(simulation: Simulation) {
    return delay(simulation, 140)
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
}
