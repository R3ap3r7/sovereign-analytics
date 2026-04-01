import { beforeEach, describe, expect, it } from 'vitest'
import { mutationStorageApi, sessionStorageApi, storage } from '../domain/persistence'
import { authApi, appApi, getSeed } from '../domain/services/mockApi'

describe('mutable app state flows', () => {
  beforeEach(() => {
    storage.reset()
    sessionStorageApi.write(null)
    mutationStorageApi.writeAdminMutation({
      currencyShifts: {},
      pairVolatilityShifts: {},
      newsToneShifts: {},
      triggeredEventIds: [],
    })
  })

  it('persists settings changes for the active user', async () => {
    await authApi.login('beginner@sovereign.demo', 'demo123')
    const user = appApi.getCurrentUser()
    expect(user).not.toBeNull()
    await appApi.saveSettings({
      ...user!.settings,
      dashboardMode: 'research-heavy',
      defaultAccountCurrency: 'EUR',
      chartDefaults: {
        ...user!.settings.chartDefaults,
        chartMode: 'candlestick',
      },
    })

    const refreshed = appApi.getCurrentUser()
    expect(refreshed?.settings.dashboardMode).toBe('research-heavy')
    expect(refreshed?.settings.defaultAccountCurrency).toBe('EUR')
    expect(refreshed?.settings.chartDefaults.chartMode).toBe('candlestick')
  })

  it('keeps linked notes retrievable in contextual workspaces', async () => {
    await authApi.login('beginner@sovereign.demo', 'demo123')
    const user = appApi.getCurrentUser()
    const note = {
      id: 'note-test-linked',
      userId: user!.id,
      title: 'USD/JPY intervention thesis',
      body: 'Watching policy divergence and intervention chatter.',
      tags: ['jpy', 'policy'],
      template: 'pair thesis',
      pinned: false,
      linkedEntities: [{ entityType: 'pair' as const, entityId: 'usd-jpy' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await appApi.createNote(note)

    const workspace = await appApi.getPairWorkspace('usd-jpy')
    expect(workspace?.notes.some((item) => item.id === note.id)).toBe(true)
  })

  it('evaluates alert and admin mutation propagation into triggered status', async () => {
    await authApi.login('beginner@sovereign.demo', 'demo123')
    const alert = await appApi.createAlert({
      entityType: 'pair',
      entityId: 'aud-jpy',
      conditionType: 'volatility_threshold',
      threshold: '75',
    })
    await appApi.applyAdminMutation({
      currencyShifts: {},
      pairVolatilityShifts: { 'aud-jpy': 20 },
      newsToneShifts: {},
      triggeredEventIds: [],
    })

    const alerts = await appApi.listAlerts()
    expect(alerts.find((item) => item.id === alert.id)?.status).toBe('triggered')
  })

  it('recalculates portfolio after opening and closing a paper trade', async () => {
    await authApi.login('portfolio@sovereign.demo', 'book123')
    const simulation = appApi.buildSimulationFromPair('eur-usd')
    const opened = await appApi.openPaperTrade(simulation)
    let workspace = await appApi.getPortfolioWorkspace()
    expect(workspace?.openPositions.some((item) => item.id === opened.id)).toBe(true)

    await appApi.closePaperTrade(opened.id)
    workspace = await appApi.getPortfolioWorkspace()
    expect(workspace?.closedPositions.some((item) => item.id === opened.id)).toBe(true)
    expect(workspace?.portfolio.balance).toBeGreaterThan(0)
  })

  it('applies admin overlays into downstream pair workspaces', async () => {
    await authApi.login('admin@sovereign.demo', 'admin123')
    const before = await appApi.getPairWorkspace('aud-jpy')
    await appApi.applyAdminMutation({
      currencyShifts: { JPY: 8 },
      pairVolatilityShifts: { 'aud-jpy': 18 },
      newsToneShifts: {},
      triggeredEventIds: [],
    })
    const after = await appApi.getPairWorkspace('aud-jpy')
    expect(after!.technical.volatilityScore).toBeGreaterThan(before!.technical.volatilityScore)
    expect(after!.eventRisk).toBeGreaterThanOrEqual(before!.eventRisk)
    expect(getSeed().alerts.length).toBeGreaterThan(0)
  })
})
