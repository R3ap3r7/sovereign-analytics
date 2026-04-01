import { type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { formatDateTime, title } from '../../lib/utils'
import { PrimaryButton } from '../shared'

const fieldClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const compactButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

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

const StatusChip = ({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warning' | 'danger' }) => (
  <span
    className={[
      'inline-flex items-center rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
      tone === 'accent'
        ? 'border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.08)] text-[var(--accent)]'
        : tone === 'warning'
          ? 'border-[rgba(224,180,108,0.24)] bg-[rgba(224,180,108,0.08)] text-[var(--warning)]'
          : tone === 'danger'
            ? 'border-[rgba(227,128,120,0.24)] bg-[rgba(227,128,120,0.08)] text-[var(--danger)]'
            : 'border-[var(--line)] bg-white/[0.03] text-[var(--muted)]',
    ].join(' ')}
  >
    {children}
  </span>
)

export const AdminPage = () => {
  const { user, adminMutation, setAdminMutation } = useAppState()
  const seed = getSeed()
  const [currency, setCurrency] = useState('JPY')
  const [eventId, setEventId] = useState('evt-us-cpi')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')

  if (!user) return <LoadingPanel label="Loading admin inspector…" />
  if (user.role !== 'admin') return <Page title="Admin"><Panel>Current persona does not have access to the demo inspector.</Panel></Page>

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
      pairVolatilityShifts: delta > 0
        ? {
            ...adminMutation.pairVolatilityShifts,
            ...Object.fromEntries(affectedPairs.map((pair) => [pair.id, (adminMutation.pairVolatilityShifts[pair.id] ?? 0) + 12])),
          }
        : adminMutation.pairVolatilityShifts,
    })
  }

  return (
    <Page title="Admin">
      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <Panel className="p-0">
          <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[color:var(--panel-2)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Inspector</div>
                  <div className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--text)]">Admin</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">Local mutations and seeded collections.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone="accent">Demo</StatusChip>
                  <StatusChip>{title(user.displayName)}</StatusChip>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Users" value={seed.users.length.toString()} />
                <MiniStat label="Currencies" value={seed.currencies.length.toString()} />
                <MiniStat label="Pairs" value={seed.pairs.length.toString()} />
                <MiniStat label="Events" value={seed.events.length.toString()} />
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <MiniStat label="News" value={seed.news.length.toString()} />
              <MiniStat label="Forecasts" value={seed.forecasts.length.toString()} />
              <MiniStat label="Alerts" value={seed.alerts.length.toString()} />
              <MiniStat label="Notes" value={seed.notes.length.toString()} />
            </div>
          </div>
        </Panel>

        <SectionCard label="Action rail" title="Mutations">
          <div className="grid gap-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Currency</div>
              <select className={fieldClass} value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {seed.currencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event</div>
              <select className={fieldClass} value={eventId} onChange={(event) => setEventId(event.target.value)}>
                {seed.events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void shiftCurrency(8)} type="button">
                Inject volatility
              </PrimaryButton>
              <PrimaryButton onClick={() => void shiftCurrency(-6)} secondary type="button">
                Weaken currency
              </PrimaryButton>
              <PrimaryButton
                onClick={() =>
                  void setAdminMutation({
                    ...adminMutation,
                    triggeredEventIds: Array.from(new Set([...adminMutation.triggeredEventIds, eventId])),
                  })
                }
                secondary
                type="button"
              >
                Trigger event
              </PrimaryButton>
              <PrimaryButton
                onClick={async () => {
                  await appApi.resetAdminMutation()
                  await setAdminMutation({ currencyShifts: {}, pairVolatilityShifts: {}, newsToneShifts: {}, triggeredEventIds: [] })
                }}
                secondary
                type="button"
              >
                Reset overlays
              </PrimaryButton>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard label="State" title="Mutation snapshot">
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
            <MiniStat label="Currency shift" value={`${currency} ${adminMutation.currencyShifts[currency] ?? 0}`} />
            <MiniStat label="Pairs affected" value={affectedPairs.length.toString()} />
            <MiniStat label="Event target" value={currentEvent?.title ?? 'None'} />
            <MiniStat label="Triggered" value={adminMutation.triggeredEventIds.length.toString()} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(adminMutation.currencyShifts).map(([code, value]) => (
              <StatusChip key={code} tone={value >= 0 ? 'accent' : 'warning'}>
                {code} {value >= 0 ? '+' : ''}
                {value}
              </StatusChip>
            ))}
            {Object.keys(adminMutation.pairVolatilityShifts).length === 0 ? (
              <StatusChip>no pair shifts</StatusChip>
            ) : (
              Object.entries(adminMutation.pairVolatilityShifts).map(([pairId, value]) => (
                <StatusChip key={pairId} tone={value > 10 ? 'warning' : 'default'}>
                  {pairId.toUpperCase()} +{value}
                </StatusChip>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard label="Collections" title="Seeded entities">
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-3">
            <MiniStat label="Active users" value={seed.users.filter((item) => item.status === 'active').length.toString()} />
            <MiniStat label="Locked" value={seed.users.filter((item) => item.locked).length.toString()} />
            <MiniStat label="Unverified" value={seed.users.filter((item) => !item.verified).length.toString()} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>Users</span>
              <select className="bg-transparent text-[var(--text)] outline-none" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Link className={compactButtonClass} to={`/app/events/${currentEvent?.id ?? seed.events[0].id}`}>
              Open event
            </Link>
            <Link className={compactButtonClass} to="/app/watchlist">
              Open watchlist
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard label="Users" title="Persona list">
          <div className="overflow-hidden">
            <div className="grid grid-cols-[1.1fr_0.7fr_0.9fr_0.7fr] gap-px bg-[var(--line)]">
              <div className="bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Persona</div>
              <div className="bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Focus</div>
              <div className="bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Status</div>
              <div className="bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">State</div>
            </div>
            {filteredUsers.map((item) => (
              <div className="grid grid-cols-[1.1fr_0.7fr_0.9fr_0.7fr] gap-px border-t border-[var(--line)]" key={item.id}>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className="text-sm font-medium text-[var(--text)]">{item.displayName}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{item.email}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--text)]">{title(item.analysisFocus)}</div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <StatusChip tone={item.locked ? 'danger' : !item.verified ? 'warning' : 'accent'}>{item.locked ? 'Locked' : item.verified ? 'Ready' : 'Verify'}</StatusChip>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3 text-xs text-[var(--muted)]">
                  {item.favoritePairs.length} pairs
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard label="Market feed" title="Live sets">
          <div className="grid gap-4">
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <MiniStat label="Currency" value={currentCurrency?.code ?? currency} />
              <MiniStat label="Region" value={currentCurrency?.regionName ?? ''} />
            </div>
            <div className="space-y-2">
              {seed.news.slice(0, 4).map((item) => (
                <div className="bg-[color:var(--panel-2)] px-3 py-3" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--text)]">{item.headline}</div>
                    <StatusChip tone={item.sentiment === 'bullish' ? 'accent' : item.sentiment === 'bearish' ? 'danger' : 'default'}>{item.sentiment}</StatusChip>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{item.source} · {formatDateTime(item.timestamp)}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {affectedPairs.map((pair) => (
                <Link className={compactButtonClass} key={pair.id} to={`/app/markets/${pair.id}`}>
                  {pair.symbol}
                </Link>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </Page>
  )
}
