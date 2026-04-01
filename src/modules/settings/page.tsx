import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, authApi, getSeed } from '../../domain/services/mockApi'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { user, saveSettings, refreshUser } = useAppState()
  const seed = getSeed()
  const [dashboardMode, setDashboardMode] = useState(user?.settings.dashboardMode ?? 'research-heavy')
  const [accountCurrency, setAccountCurrency] = useState(user?.settings.defaultAccountCurrency ?? 'USD')
  const [theme, setTheme] = useState(user?.settings.theme ?? 'terminal')
  const [density, setDensity] = useState(user?.settings.density ?? 'research')
  const [chartMode, setChartMode] = useState(user?.settings.chartDefaults.chartMode ?? 'line')
  const [timeframe, setTimeframe] = useState(user?.settings.chartDefaults.timeframe ?? '1M')
  const [favoriteCurrencies, setFavoriteCurrencies] = useState((user?.settings.favoriteCurrencies ?? ['USD']).join(', '))
  const [favoritePairs, setFavoritePairs] = useState((user?.settings.favoritePairs ?? ['eur-usd']).join(', '))
  const [alertsEnabled, setAlertsEnabled] = useState(user?.settings.notificationPrefs.alerts ?? true)
  const [newsEnabled, setNewsEnabled] = useState(user?.settings.notificationPrefs.news ?? true)
  const [eventsEnabled, setEventsEnabled] = useState(user?.settings.notificationPrefs.events ?? true)
  const [mock2FAEnabled, setMock2FAEnabled] = useState(user?.settings.mock2FAEnabled ?? true)
  const [personaId, setPersonaId] = useState(user?.id ?? '')
  if (!user) return <LoadingPanel label="Loading settings…" />
  return (
    <Page title="Settings & Profile" description="Preferences here immediately influence dashboard composition, simulation defaults, chart setup, and local auth behavior.">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle eyebrow="Profile" title={user.displayName} />
          <div className="space-y-2 text-sm text-[var(--muted)]">
            <div>{user.email}</div>
            <div>Persona role: {user.role}</div>
            <div>Analysis focus: {user.analysisFocus}</div>
          </div>
          <div className="mt-4 space-y-3">
            <label className="text-sm text-[var(--muted)]">Switch persona
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
                {seed.users.filter((item) => !item.locked).map((item) => (
                  <option key={item.id} value={item.id}>{item.displayName}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={async () => {
                await appApi.switchPersona(personaId)
                await refreshUser()
                navigate('/app/dashboard')
              }} secondary type="button">
                Switch persona
              </PrimaryButton>
              <PrimaryButton onClick={async () => {
                await appApi.resetOnboarding()
                await refreshUser()
                navigate('/onboarding')
              }} secondary type="button">
                Reset onboarding
              </PrimaryButton>
              <PrimaryButton onClick={async () => {
                await appApi.resetDemoState()
                await refreshUser()
                navigate('/app/dashboard')
              }} secondary type="button">
                Reset demo state
              </PrimaryButton>
            </div>
          </div>
          <div className="mt-6">
            <PrimaryButton
              onClick={async () => {
                await authApi.logout()
                await refreshUser()
                navigate('/login')
              }}
              secondary
              type="button"
            >
              Logout
            </PrimaryButton>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Preferences" title="Immediate app defaults" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[var(--muted)]">Dashboard mode
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={dashboardMode} onChange={(event) => setDashboardMode(event.target.value as typeof dashboardMode)}>
                <option value="compact">Compact</option>
                <option value="research-heavy">Research-heavy</option>
                <option value="simulation-heavy">Simulation-heavy</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Account currency
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Theme
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
                <option value="terminal">Terminal</option>
                <option value="paper">Paper</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Density
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={density} onChange={(event) => setDensity(event.target.value as typeof density)}>
                <option value="compact">Compact</option>
                <option value="research">Research</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Default chart mode
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={chartMode} onChange={(event) => setChartMode(event.target.value as typeof chartMode)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="candlestick">Candlestick</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Default timeframe
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={timeframe} onChange={(event) => setTimeframe(event.target.value as typeof timeframe)}>
                <option value="1D">1D</option>
                <option value="1W">1W</option>
                <option value="1M">1M</option>
                <option value="3M">3M</option>
                <option value="6M">6M</option>
                <option value="1Y">1Y</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Favorite currencies
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={favoriteCurrencies} onChange={(event) => setFavoriteCurrencies(event.target.value)} />
            </label>
            <label className="text-sm text-[var(--muted)]">Favorite pairs
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={favoritePairs} onChange={(event) => setFavoritePairs(event.target.value)} />
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]"><input checked={alertsEnabled} onChange={(event) => setAlertsEnabled(event.target.checked)} type="checkbox" /> Alert notifications</label>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]"><input checked={newsEnabled} onChange={(event) => setNewsEnabled(event.target.checked)} type="checkbox" /> News notifications</label>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]"><input checked={eventsEnabled} onChange={(event) => setEventsEnabled(event.target.checked)} type="checkbox" /> Event notifications</label>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]"><input checked={mock2FAEnabled} onChange={(event) => setMock2FAEnabled(event.target.checked)} type="checkbox" /> Mock 2FA enabled</label>
          </div>
          <div className="mt-4">
            <PrimaryButton
              onClick={async () => {
                await saveSettings({
                  ...user.settings,
                  dashboardMode,
                  defaultAccountCurrency: accountCurrency,
                  theme,
                  density,
                  chartDefaults: {
                    ...user.settings.chartDefaults,
                    chartMode,
                    timeframe,
                  },
                  favoriteCurrencies: favoriteCurrencies.split(',').map((item) => item.trim()).filter(Boolean),
                  favoritePairs: favoritePairs.split(',').map((item) => item.trim()).filter(Boolean),
                  notificationPrefs: {
                    alerts: alertsEnabled,
                    news: newsEnabled,
                    events: eventsEnabled,
                  },
                  mock2FAEnabled,
                })
              }}
              type="button"
            >
              Save settings
            </PrimaryButton>
          </div>
        </Panel>
      </div>
    </Page>
  )
}
