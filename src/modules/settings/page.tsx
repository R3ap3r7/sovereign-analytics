import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { appApi, authApi, getSeed } from '../../domain/services/mockApi'
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

const SectionCard = ({ label, title: sectionTitle, detail, children }: { label: string; title: string; detail?: string; children: ReactNode }) => (
  <Panel className="p-0">
    <div className="border-b border-[var(--line)] bg-[color:var(--panel)] px-4 py-3">
      <SectionTitle eyebrow={label} title={sectionTitle} detail={detail} />
    </div>
    <div className="p-4">{children}</div>
  </Panel>
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
  const [mock2FAEnabled, setMock2FAEnabled] = useState(user?.settings.mock2FAEnabled ?? true)
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
    setMock2FAEnabled(user.settings.mock2FAEnabled)
    setPersonaId(user.id)
  }, [user])

  if (!user) return <LoadingPanel label="Loading settings…" />

  const seed = getSeed()
  const portfolio = seed.portfolios.find((item) => item.id === user.portfolioId)
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
      mock2FAEnabled,
    })
  }

  return (
    <Page
      title="Settings"
      actions={
        <>
          <PrimaryButton onClick={save} type="button">
            Save
          </PrimaryButton>
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
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="p-0">
          <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[color:var(--panel-2)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Profile</div>
                  <div className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--text)]">{user.displayName}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{user.email}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                    {title(user.role)}
                  </span>
                  <span className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                    {user.locked ? 'Locked' : user.verified ? 'Verified' : 'Unverified'}
                  </span>
                  <span className="inline-flex items-center rounded-[2px] border border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.08)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
                    {title(user.analysisFocus)}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Currency" value={accountCurrency} />
                <MiniStat label="Dashboard" value={title(dashboardMode)} />
                <MiniStat label="Theme" value={title(theme)} />
                <MiniStat label="Density" value={title(density)} />
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <MiniStat label="Portfolio" value={portfolio?.baseCurrency ?? 'USD'} />
              <MiniStat label="Watchlist" value={`${user.favoritePairs.length + user.favoriteCurrencies.length}`} />
              <MiniStat label="Notes" value={`${user.noteIds.length}`} />
              <MiniStat label="Simulations" value={`${user.savedSimulationIds.length}`} />
            </div>
          </div>
        </Panel>

        <SectionCard label="Session" title="Controls">
          <div className="grid gap-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Persona</div>
              <select className={fieldClass} value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
                {seed.users.filter((item) => !item.locked).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <MiniStat label="Onboarding" value={user.onboardingCompleted ? 'Complete' : 'Pending'} />
              <MiniStat label="Mock 2FA" value={mock2FAEnabled ? 'Enabled' : 'Off'} />
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
                Switch
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
                Reset onboarding
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
                Reset demo
              </PrimaryButton>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard label="Workspace" title="Preferences">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Dashboard mode</div>
              <select className={fieldClass} value={dashboardMode} onChange={(event) => setDashboardMode(event.target.value as typeof dashboardMode)}>
                <option value="compact">Compact</option>
                <option value="research-heavy">Research Heavy</option>
                <option value="simulation-heavy">Simulation Heavy</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Default currency</div>
              <select className={fieldClass} value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)}>
                {seed.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Theme</div>
              <select className={fieldClass} value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}>
                <option value="terminal">Terminal</option>
                <option value="paper">Paper</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Density</div>
              <select className={fieldClass} value={density} onChange={(event) => setDensity(event.target.value as typeof density)}>
                <option value="compact">Compact</option>
                <option value="research">Research</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Chart mode</div>
              <select className={fieldClass} value={chartMode} onChange={(event) => setChartMode(event.target.value as typeof chartMode)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="candlestick">Candlestick</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Timeframe</div>
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
          <div className="mt-4 flex flex-wrap gap-2">
            {['macro', 'technical', 'simulation', 'portfolio'].map((focus) => (
              <span
                className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]"
                key={focus}
              >
                {focus}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard label="Notifications" title="Defaults">
          <div className="grid gap-3">
            <ToggleRow label="Alerts" checked={alertsEnabled} onChange={setAlertsEnabled} />
            <ToggleRow label="News" checked={newsEnabled} onChange={setNewsEnabled} />
            <ToggleRow label="Events" checked={eventsEnabled} onChange={setEventsEnabled} />
            <ToggleRow label="Mock 2FA" checked={mock2FAEnabled} onChange={setMock2FAEnabled} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Favorite currencies</div>
              <input className={fieldClass} value={favoriteCurrencies} onChange={(event) => setFavoriteCurrencies(event.target.value)} />
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Favorite pairs</div>
              <input className={fieldClass} value={favoritePairs} onChange={(event) => setFavoritePairs(event.target.value)} />
            </label>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SectionCard label="Context" title="Saved state">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Currency set</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {favoriteCurrencyCards.map((currency) => (
                  <Link
                    className={compactButtonClass}
                    key={currency.code}
                    to={`/app/currencies/${currency.code}`}
                  >
                    {currency.code}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Pair set</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {favoritePairCards.map((pair) => (
                  <Link className={compactButtonClass} key={pair.id} to={`/app/markets/${pair.id}`}>
                    {pair.symbol}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-px bg-[var(--line)] lg:grid-cols-2">
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Simulations</div>
              <div className="mt-3 space-y-2">
                {savedSimulations.map((simulation) => (
                  <Link
                    className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm transition hover:bg-[color:var(--panel-3)]"
                    key={simulation.id}
                    to={`/app/simulation?simulation=${simulation.id}`}
                  >
                    <span>{simulation.pairId.toUpperCase()}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(simulation.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Notes</div>
              <div className="mt-3 space-y-2">
                {linkedNotes.map((note) => (
                  <Link
                    className="block border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm transition hover:bg-[color:var(--panel-3)]"
                    key={note.id}
                    to="/app/notes"
                  >
                    <div className="font-medium text-[var(--text)]">{note.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{title(note.template)}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard label="Recovery" title="Storage">
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
            <MiniStat label="Persona" value={user.displayName} />
            <MiniStat label="Portfolios" value={seed.portfolios.length.toString()} />
            <MiniStat label="Visited pairs" value={seed.pairs.length.toString()} />
            <MiniStat label="Saved notes" value={seed.notes.length.toString()} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
              Clear demo data
            </PrimaryButton>
          </div>
        </SectionCard>
      </div>
    </Page>
  )
}
