import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingPanel } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { appApi, authApi, getSeed } from '../../domain/services/api'
import { formatDateTime, title } from '../../lib/utils'
import { PrimaryButton } from '../shared'

const fieldClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const compactButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) => (
  <label className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--text)]">
    <span>{label}</span>
    <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
  </label>
)

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-[color:var(--panel-2)] px-4 py-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
    <div className="mt-2 text-[1rem] font-semibold tracking-[-0.02em] text-[var(--text)]">{value}</div>
  </div>
)

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { user, saveSettings, refreshUser } = useAppState()
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.settings.mock2FAEnabled ?? true)
  const [personaId, setPersonaId] = useState(user?.id ?? '')

  useEffect(() => {
    if (!user) return
    setDashboardMode(user.settings.dashboardMode)
    setAccountCurrency(user.settings.defaultAccountCurrency)
    setTheme(user.settings.theme)
    setDensity(user.settings.density)
    setChartMode(user.settings.chartDefaults.chartMode)
    setTimeframe(user.settings.chartDefaults.timeframe)
    setFavoriteCurrencies(user.settings.favoriteCurrencies.join(', '))
    setFavoritePairs(user.settings.favoritePairs.join(', '))
    setAlertsEnabled(user.settings.notificationPrefs.alerts)
    setNewsEnabled(user.settings.notificationPrefs.news)
    setEventsEnabled(user.settings.notificationPrefs.events)
    setTwoFactorEnabled(user.settings.mock2FAEnabled)
    setPersonaId(user.id)
  }, [user])

  if (!user) return <LoadingPanel label="Loading settings…" />

  const seed = getSeed()
  const savedSimulations = seed.simulations.filter((item) => item.userId === user.id).slice(0, 4)
  const linkedNotes = seed.notes
    .filter(
      (note) =>
        note.userId === user.id ||
        note.linkedEntities.some(
          (entity) =>
            (entity.entityType === 'pair' && user.favoritePairs.includes(entity.entityId)) ||
            (entity.entityType === 'currency' && user.favoriteCurrencies.includes(entity.entityId)) ||
            entity.entityType === 'simulation',
        ),
    )
    .slice(0, 4)
  const favoriteCurrencyCards = seed.currencies.filter((currency) => user.favoriteCurrencies.includes(currency.code)).slice(0, 4)
  const favoritePairCards = seed.pairs.filter((pair) => user.favoritePairs.includes(pair.id)).slice(0, 4)

  const save = async () => {
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
      favoriteCurrencies: favoriteCurrencies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      favoritePairs: favoritePairs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      notificationPrefs: {
        alerts: alertsEnabled,
        news: newsEnabled,
        events: eventsEnabled,
      },
      mock2FAEnabled: twoFactorEnabled,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-[color:var(--panel)] py-4 lg:sticky lg:top-4 lg:self-start">
        <div className="px-4 mb-6">
          <div className="flex flex-col">
            <span className="font-display font-bold text-[var(--text)] text-sm">{user.displayName}</span>
            <span className="text-[11px] text-[var(--muted)] font-medium uppercase tracking-[0.12em]">{title(user.role)} tier</span>
            <span className="text-[10px] text-[var(--muted)] mt-0.5">{accountCurrency} / {title(user.analysisFocus)}</span>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {[
            'Profile',
            'Currency',
            'Persona',
            'Theme',
            'Density',
            'Charts',
            'Favorite Currencies',
            'Pairs',
            'Alerts',
            '2FA',
            'Onboarding',
            'Reset',
          ].map((item) => (
            <button
              key={item}
              type="button"
              className={item === 'Theme' ? 'flex items-center gap-3 px-4 py-2 text-[12px] text-[var(--accent)] font-bold border-l-2 border-[var(--accent)] bg-[color:var(--panel-2)] transition-all' : 'flex items-center gap-3 px-4 py-2 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color:var(--panel-2)] transition-all'}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-[-0.04em] text-[var(--text)]">Settings</h1>
            <p className="text-sm text-[var(--muted)] max-w-2xl">Manage workspace preferences, visualization defaults, account routing, and access controls for the Sovereign environment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={save} type="button">Save</PrimaryButton>
            <PrimaryButton
              onClick={async () => {
                await authApi.logout()
                await refreshUser()
                navigate('/login')
              }}
              secondary
              type="button"
            >
              Sign out
            </PrimaryButton>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="bg-[color:var(--panel)] p-5 border-l-2 border-[var(--accent)]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Visual Theme</span>
              <span className="text-[var(--accent)] text-sm">Theme</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Graphite Dark', value: 'terminal' as const, active: theme === 'terminal' },
                { label: 'Paper Light', value: 'paper' as const, active: theme === 'paper' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setTheme(item.value)}
                  type="button"
                  className={item.active ? 'flex w-full items-center justify-between p-2 bg-[color:var(--panel-2)] border-b border-[color:rgba(141,164,179,0.1)] text-[var(--text)]' : 'flex w-full items-center justify-between p-2 text-[var(--muted)] hover:bg-[color:var(--panel-2)] transition-colors'}
                >
                  <span className="text-xs">{item.label}</span>
                  {item.active ? <span className="text-[var(--accent)] text-sm">●</span> : null}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Interface Density</span>
              <span className="text-[var(--muted)] text-sm">Density</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Compact', value: 'compact' as const },
                { label: 'Research', value: 'research' as const },
                { label: 'Dense', value: 'compact' as const },
              ].map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  onClick={() => setDensity(item.value)}
                  type="button"
                  className={density === item.value && index < 2 ? 'flex flex-col items-center gap-2 p-3 bg-[rgba(105,211,192,0.12)] border border-[var(--accent)] transition-colors' : 'flex flex-col items-center gap-2 p-3 bg-[color:var(--panel-2)] border border-[color:rgba(141,164,179,0.12)] hover:border-[rgba(105,211,192,0.35)] transition-colors'}
                >
                  <span className={density === item.value && index < 2 ? 'text-[11px] text-[var(--accent)] font-bold' : 'text-[11px] text-[var(--muted)]'}>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-[color:var(--panel)] p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-[var(--text)]">
            <span className="w-1 h-4 bg-[var(--warning)]" />
            Chart Defaults & Execution
          </h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div className="space-y-4">
              <label className="group block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] block mb-1">Base Currency Preference</div>
                <select className={fieldClass} value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)}>
                  {seed.currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>
                  ))}
                </select>
              </label>
              <label className="group block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] block mb-1">Dashboard Mode</div>
                <select className={fieldClass} value={dashboardMode} onChange={(event) => setDashboardMode(event.target.value as typeof dashboardMode)}>
                  <option value="compact">Compact</option>
                  <option value="research-heavy">Research Heavy</option>
                  <option value="simulation-heavy">Simulation Heavy</option>
                </select>
              </label>
              <label className="group block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] block mb-1">Chart Mode</div>
                <select className={fieldClass} value={chartMode} onChange={(event) => setChartMode(event.target.value as typeof chartMode)}>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                  <option value="candlestick">Candlestick</option>
                </select>
              </label>
              <label className="group block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] block mb-1">Timeframe</div>
                <select className={fieldClass} value={timeframe} onChange={(event) => setTimeframe(event.target.value as typeof timeframe)}>
                  <option value="1D">1D</option>
                  <option value="1W">1W</option>
                  <option value="1M">1M</option>
                  <option value="3M">3M</option>
                  <option value="6M">6M</option>
                  <option value="1Y">1Y</option>
                </select>
              </label>
            </div>
            <div className="space-y-4">
              <ToggleRow label="Alerts" checked={alertsEnabled} onChange={setAlertsEnabled} />
              <ToggleRow label="News" checked={newsEnabled} onChange={setNewsEnabled} />
              <ToggleRow label="Events" checked={eventsEnabled} onChange={setEventsEnabled} />
              <ToggleRow label="Two-factor check" checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-[color:var(--panel)] p-5">
            <h2 className="text-sm font-bold mb-4 text-[var(--text)]">Workspace Sets</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] mb-1">Favorite currencies</div>
                <input className={fieldClass} value={favoriteCurrencies} onChange={(event) => setFavoriteCurrencies(event.target.value)} />
              </label>
              <label className="block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em] mb-1">Favorite pairs</div>
                <input className={fieldClass} value={favoritePairs} onChange={(event) => setFavoritePairs(event.target.value)} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em]">Currency set</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoriteCurrencyCards.map((currency) => (
                    <Link className={compactButtonClass} key={currency.code} to={`/app/currencies/${currency.code}`}>{currency.code}</Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em]">Pair set</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoritePairCards.map((pair) => (
                    <Link className={compactButtonClass} key={pair.id} to={`/app/markets/${pair.id}`}>{pair.symbol}</Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[rgba(147,0,10,0.05)] p-5 border border-[rgba(227,128,120,0.12)]">
            <h2 className="text-sm font-bold text-[var(--danger)] mb-2 flex items-center gap-2">
              System Integrity
            </h2>
            <p className="text-sm text-[var(--muted)]">Manage persona switching, onboarding recovery, and workspace reset operations.</p>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-[0.14em]">Persona</div>
                <select className={fieldClass} value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
                  {seed.users.filter((item) => !item.locked).map((item) => (
                    <option key={item.id} value={item.id}>{item.displayName}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <MiniStat label="Onboarding" value={user.onboardingCompleted ? 'Complete' : 'Pending'} />
                <MiniStat label="2FA" value={twoFactorEnabled ? 'Enabled' : 'Off'} />
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={async () => {
                    await appApi.switchPersona(personaId)
                    await refreshUser()
                    navigate('/app/dashboard')
                  }}
                  secondary
                  type="button"
                >
                  Apply persona
                </PrimaryButton>
                <PrimaryButton
                  onClick={async () => {
                    await appApi.resetOnboarding()
                    await refreshUser()
                    navigate('/onboarding')
                  }}
                  secondary
                  type="button"
                >
                  Reopen onboarding
                </PrimaryButton>
                <PrimaryButton
                  onClick={async () => {
                    await appApi.resetDemoState()
                    await refreshUser()
                    navigate('/login')
                  }}
                  secondary
                  type="button"
                >
                  Reset workspace state
                </PrimaryButton>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="bg-[color:var(--panel)] p-5">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.14em] font-bold">Simulations</div>
            <div className="mt-3 space-y-2">
              {savedSimulations.map((simulation) => (
                <Link className="flex items-center justify-between gap-3 bg-[color:var(--panel-2)] px-3 py-2 text-sm transition hover:bg-[color:var(--panel-3)]" key={simulation.id} to={`/app/simulation?simulation=${simulation.id}`}>
                  <span>{simulation.pairId.toUpperCase()}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(simulation.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-5">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.14em] font-bold">Notes</div>
            <div className="mt-3 space-y-2">
              {linkedNotes.map((note) => (
                <Link className="block bg-[color:var(--panel-2)] px-3 py-2 text-sm transition hover:bg-[color:var(--panel-3)]" key={note.id} to="/app/notes">
                  <div className="font-medium text-[var(--text)]">{note.title}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{title(note.template)}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
