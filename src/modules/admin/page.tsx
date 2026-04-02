import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingPanel, Page } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { formatDateTime, title } from '../../lib/utils'

const fieldClass = 'w-full border-none bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none'

export const AdminPage = () => {
  const { user, adminMutation, setAdminMutation } = useAppState()
  const seed = getSeed()
  const [currency, setCurrency] = useState('JPY')
  const [eventId, setEventId] = useState('evt-us-cpi')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')

  if (!user) return <LoadingPanel label="Loading admin inspector…" />
  if (user.role !== 'admin') return <Page title="Admin">Current persona does not have access to the demo inspector.</Page>

  const currentCurrency = seed.currencies.find((item) => item.code === currency)
  const currentEvent = seed.events.find((item) => item.id === eventId)
  const filteredUsers = seed.users.filter((item) => (roleFilter === 'all' ? true : item.role === roleFilter))
  const affectedPairs = seed.pairs.filter((pair) => pair.baseCode === currency || pair.quoteCode === currency)

  const shiftCurrency = async (delta: number) => {
    await setAdminMutation({
      ...adminMutation,
      currencyShifts: {
        ...adminMutation.currencyShifts,
        [currency]: (adminMutation.currencyShifts[currency] ?? 0) + delta,
      },
      pairVolatilityShifts:
        delta > 0
          ? {
              ...adminMutation.pairVolatilityShifts,
              ...Object.fromEntries(affectedPairs.map((pair) => [pair.id, (adminMutation.pairVolatilityShifts[pair.id] ?? 0) + 12])),
            }
          : adminMutation.pairVolatilityShifts,
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-[color:var(--panel)] p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(8,minmax(0,8rem))]">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Mutation console</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--text)]">Admin Inspector</h1>
          </div>
          {[
            ['Users', seed.users.length],
            ['Currencies', seed.currencies.length],
            ['Pairs', seed.pairs.length],
            ['Events', seed.events.length],
            ['News', seed.news.length],
            ['Forecasts', seed.forecasts.length],
            ['Alerts', seed.alerts.length],
            ['Notes', seed.notes.length],
          ].map(([label, value]) => (
            <div className="bg-[color:var(--panel-2)] px-3 py-3" key={label}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
              <div className="mt-2 text-xl font-bold tabular-nums text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_0.95fr_20rem]">
        <section className="space-y-4">
          <div className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Persona table</div>
              <select className="border-none bg-[color:var(--panel-2)] px-3 py-2 text-[11px] text-[var(--text)] outline-none" onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} value={roleFilter}>
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              {filteredUsers.map((item) => (
                <div className="grid grid-cols-[minmax(0,1.2fr)_0.7fr_0.7fr] gap-2 bg-[color:var(--panel-2)] px-3 py-3" key={item.id}>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">{item.displayName}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.email}</div>
                  </div>
                  <div className="text-sm text-[var(--text)]">{title(item.analysisFocus)}</div>
                  <div className={item.locked ? 'text-sm font-semibold text-[var(--danger)]' : !item.verified ? 'text-sm font-semibold text-[var(--warning)]' : 'text-sm font-semibold text-[var(--accent)]'}>
                    {item.locked ? 'Locked' : item.verified ? 'Ready' : 'Verify'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Seeded collections</div>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                ['Active users', seed.users.filter((item) => item.status === 'active').length],
                ['Locked', seed.users.filter((item) => item.locked).length],
                ['Unverified', seed.users.filter((item) => !item.verified).length],
                ['Triggered events', adminMutation.triggeredEventIds.length],
              ].map(([label, value]) => (
                <div className="bg-[color:var(--panel-2)] px-3 py-3" key={label}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
                  <div className="mt-2 text-sm font-bold text-[var(--text)]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Mutation snapshot</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="bg-[color:var(--panel-2)] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Currency shift</div>
                <div className="mt-2 text-sm font-bold text-[var(--text)]">{currency} {adminMutation.currencyShifts[currency] ?? 0}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Pairs affected</div>
                <div className="mt-2 text-sm font-bold text-[var(--text)]">{affectedPairs.length}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event target</div>
                <div className="mt-2 text-sm font-bold text-[var(--text)]">{currentEvent?.title ?? 'None'}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Live monitor</div>
                <div className="mt-2 text-sm font-bold text-[var(--accent)]">Correlation drift active</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(adminMutation.currencyShifts).map(([code, value]) => (
                <span className={value >= 0 ? 'bg-[rgba(105,211,192,0.1)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--accent)]' : 'bg-[rgba(227,128,120,0.12)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--danger)]'} key={code}>
                  {code} {value >= 0 ? '+' : ''}
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Live news</div>
            <div className="space-y-2">
              {seed.news.slice(0, 4).map((item) => (
                <div className="bg-[color:var(--panel-2)] px-3 py-3" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--text)]">{item.headline}</div>
                    <span className={item.sentiment === 'bullish' ? 'text-[11px] font-semibold text-[var(--accent)]' : item.sentiment === 'bearish' ? 'text-[11px] font-semibold text-[var(--danger)]' : 'text-[11px] font-semibold text-[var(--muted)]'}>
                      {item.sentiment}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.source} · {formatDateTime(item.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Mutation controls</div>
            <div className="space-y-3">
              <select className={fieldClass} onChange={(event) => setCurrency(event.target.value)} value={currency}>
                {seed.currencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
              <select className={fieldClass} onChange={(event) => setEventId(event.target.value)} value={eventId}>
                {seed.events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <button className="w-full bg-[color:var(--panel-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[color:var(--panel-3)]" onClick={() => void shiftCurrency(8)} type="button">
                Inject volatility
              </button>
              <button className="w-full bg-[color:var(--panel-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[color:var(--panel-3)]" onClick={() => void shiftCurrency(-6)} type="button">
                Weaken currency
              </button>
              <button
                className="w-full bg-[color:var(--panel-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
                onClick={() =>
                  void setAdminMutation({
                    ...adminMutation,
                    triggeredEventIds: Array.from(new Set([...adminMutation.triggeredEventIds, eventId])),
                  })
                }
                type="button"
              >
                Trigger event
              </button>
              <button
                className="w-full bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white"
                onClick={async () => {
                  await appApi.resetAdminMutation()
                  await setAdminMutation({ currencyShifts: {}, pairVolatilityShifts: {}, newsToneShifts: {}, triggeredEventIds: [] })
                }}
                type="button"
              >
                Reset overlays
              </button>
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Affected pairs</div>
            <div className="space-y-2">
              {affectedPairs.map((pair) => (
                <Link className="flex items-center justify-between bg-[color:var(--panel-2)] px-3 py-2.5 transition hover:bg-[color:var(--panel-3)]" key={pair.id} to={`/app/markets/${pair.id}`}>
                  <span className="text-sm font-medium text-[var(--text)]">{pair.symbol}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Open</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {currentCurrency?.regionName} · {currentCurrency?.centralBank}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
