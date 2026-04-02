import { BellRing, Eye, Filter, Radar, Siren, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/api'
import { buildEntityLabel } from '../../domain/selectors'
import type { AlertConditionType, EntityType, WatchEntityType, WatchlistItem } from '../../domain/types'
import { useAsyncResource } from '../../lib/useAsyncResource'

const fieldClass =
  'w-full border-none bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none'

const filterButtonClass = (active: boolean) =>
  active
    ? 'px-3 py-2 text-[11px] font-semibold text-[var(--accent)] bg-[color:var(--panel-3)]'
    : 'px-3 py-2 text-[11px] font-medium text-[var(--muted)] bg-[color:var(--panel)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

const priorityToneClass = (priority: WatchlistItem['priority']) =>
  priority === 'high'
    ? 'text-[var(--danger)]'
    : priority === 'medium'
      ? 'text-[var(--warning)]'
      : 'text-[var(--muted)]'

const priorityBadgeTone = (priority: WatchlistItem['priority']) =>
  priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'default'

const alertToneClass = (status: string) =>
  status === 'triggered' ? 'text-[var(--danger)]' : status === 'active' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'

const priorityRank = (priority: WatchlistItem['priority']) => (priority === 'high' ? 2 : priority === 'medium' ? 1 : 0)

const linkedLabel = (seed: ReturnType<typeof getSeed>, entityType: EntityType, entityId: string) => {
  if (entityType === 'forecast') {
    const forecast = seed.forecasts.find((item) => item.id === entityId)
    return forecast ? `${forecast.pairId.toUpperCase()} forecast` : entityId
  }
  if (entityType === 'simulation') {
    const simulation = seed.simulations.find((item) => item.id === entityId)
    return simulation ? `${simulation.pairId.toUpperCase()} ${simulation.scenarioType}` : entityId
  }
  if (entityType === 'strategy') return seed.strategies.find((item) => item.id === entityId)?.name ?? entityId
  return buildEntityLabel(seed, entityType, entityId)
}

export const WatchlistPage = () => {
  const seed = getSeed()
  const { data, loading, setData } = useAsyncResource(async () => {
    const [watchlist, alerts] = await Promise.all([appApi.listWatchlistItems(), appApi.listAlerts()])
    return { watchlist, alerts }
  }, [])

  const [entityType, setEntityType] = useState<WatchEntityType>('pair')
  const [entityId, setEntityId] = useState('eur-usd')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [view, setView] = useState<'all' | WatchEntityType>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | WatchlistItem['priority']>('all')
  const [alertEntityType, setAlertEntityType] = useState<EntityType>('pair')
  const [alertConditionType, setAlertConditionType] = useState<AlertConditionType>('price_cross')
  const [alertEntityId, setAlertEntityId] = useState('eur-usd')
  const [threshold, setThreshold] = useState('1.0950')

  const options = useMemo(
    () =>
      ({
        pair: seed.pairs.map((item) => ({ value: item.id, label: item.symbol })),
        currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` })),
        event: seed.events.map((item) => ({ value: item.id, label: item.title })),
        forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
        simulation: seed.simulations.map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} · ${item.scenarioType}` })),
        strategy: seed.strategies.map((item) => ({ value: item.id, label: item.name })),
      }) satisfies Record<EntityType, Array<{ value: string; label: string }>>,
    [seed],
  )

  const watchlist = data?.watchlist ?? []
  const alerts = data?.alerts ?? []
  const filteredWatchlist = useMemo(
    () =>
      [...watchlist]
        .filter((item) => (view === 'all' ? true : item.entityType === view))
        .filter((item) => (priorityFilter === 'all' ? true : item.priority === priorityFilter))
        .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [priorityFilter, view, watchlist],
  )

  if (loading || !data) return <LoadingPanel label="Loading watchlist…" />

  const triggeredAlerts = alerts.filter((item) => item.status === 'triggered')
  const activeAlerts = alerts.filter((item) => item.status === 'active')
  const coverageItems = filteredWatchlist.slice(0, 4)

  return (
    <Page
      actions={
        <>
          <Badge tone="accent">{watchlist.length} tracked</Badge>
          <Badge tone={triggeredAlerts.length ? 'warning' : 'default'}>{triggeredAlerts.length} triggered</Badge>
        </>
      }
      description="Track pairs, currencies, events, and forecasts from one place, then route straight into the deeper workspace."
      title="Watchlist & Alerts"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel className="p-0">
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Tracked', String(watchlist.length), <Eye className="size-4" />],
                ['Alerts', String(alerts.length), <BellRing className="size-4" />],
                ['Active', String(activeAlerts.length), <Radar className="size-4" />],
                ['Triggered', String(triggeredAlerts.length), <Siren className="size-4" />],
                ['Priority', String(filteredWatchlist.filter((item) => item.priority === 'high').length), <Star className="size-4" />],
              ].map(([label, value, icon]) => (
                <div className="bg-[color:var(--panel-2)] px-4 py-4" key={label as string}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label as string}</div>
                    <div className="text-[var(--accent)]">{icon}</div>
                  </div>
                  <div className="mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{value as string}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Filters" title="Coverage view" detail="Switch between entity types and priority lanes without losing the current watch state." />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1 bg-[color:var(--panel-2)] p-1">
                {(['all', 'pair', 'currency', 'event', 'forecast'] as const).map((item) => (
                  <button className={filterButtonClass(view === item)} key={item} onClick={() => setView(item)} type="button">
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-[var(--muted)] lg:block">
                  <Filter className="size-4" />
                </div>
                <div className="flex flex-wrap gap-1 bg-[color:var(--panel-2)] p-1">
                  {(['all', 'high', 'medium', 'low'] as const).map((item) => (
                    <button className={filterButtonClass(priorityFilter === item)} key={item} onClick={() => setPriorityFilter(item)} type="button">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredWatchlist.map((item) => {
              const href = appApi.getEntityHref(item.entityType, item.entityId)
              const label = linkedLabel(seed, item.entityType === 'forecast' ? 'forecast' : item.entityType, item.entityId)
              const relatedAlert = alerts.find((alert) => alert.entityId === item.entityId)
              return (
                <Panel key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{label}</h3>
                        <Badge tone={priorityBadgeTone(item.priority)}>{item.priority}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        <span>{item.entityType}</span>
                        <span>•</span>
                        <span>{item.entityId}</span>
                      </div>
                    </div>
                    <Badge tone={relatedAlert?.status === 'triggered' ? 'danger' : relatedAlert?.status === 'active' ? 'accent' : 'default'}>
                      {relatedAlert?.status ?? 'tracking'}
                    </Badge>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Added</div>
                      <div className="mt-2 text-sm font-medium text-[var(--text)]">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Priority</div>
                      <div className={`mt-2 text-sm font-semibold ${priorityToneClass(item.priority)}`}>{item.priority}</div>
                    </div>
                    <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Alert</div>
                      <div className={`mt-2 text-sm font-semibold ${alertToneClass(relatedAlert?.status ?? 'active')}`}>{relatedAlert?.status ?? 'tracking'}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--muted)]">Open the linked entity or tighten the rule set from the right rail.</div>
                    <Link className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.35)] hover:text-[var(--accent)]" to={href}>
                      Open
                    </Link>
                  </div>
                </Panel>
              )
            })}
            {!filteredWatchlist.length ? (
              <Panel className="lg:col-span-2">
                <div className="text-sm text-[var(--muted)]">No tracked entities match the current filter.</div>
              </Panel>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Priority lane" title="High attention" detail="The four highest-ranked items stay surfaced here for faster scanning." />
            <div className="space-y-2">
              {coverageItems.length ? (
                coverageItems.map((item) => (
                  <Link
                    className="flex items-center justify-between rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]"
                    key={item.id}
                    to={appApi.getEntityHref(item.entityType, item.entityId)}
                  >
                    <span className="text-sm font-medium text-[var(--text)]">{linkedLabel(seed, item.entityType === 'forecast' ? 'forecast' : item.entityType, item.entityId)}</span>
                    <Badge tone={priorityBadgeTone(item.priority)}>{item.priority}</Badge>
                  </Link>
                ))
              ) : (
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--muted)]">No priority coverage.</div>
              )}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Add" title="Track entity" />
            <div className="space-y-3">
              <select
                className={fieldClass}
                onChange={(event) => {
                  const next = event.target.value as WatchEntityType
                  setEntityType(next)
                  setEntityId(options[next][0]?.value ?? '')
                }}
                value={entityType}
              >
                <option value="pair">Pair</option>
                <option value="currency">Currency</option>
                <option value="event">Event</option>
                <option value="forecast">Forecast</option>
              </select>
              <select className={fieldClass} onChange={(event) => setEntityId(event.target.value)} value={entityId}>
                {options[entityType].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select className={fieldClass} onChange={(event) => setPriority(event.target.value as WatchlistItem['priority'])} value={priority}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                className="w-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--bg)]"
                onClick={() =>
                  void appApi.upsertWatchlist(entityType, entityId, priority).then((watchlistItems) => setData({ ...data, watchlist: watchlistItems }))
                }
                type="button"
              >
                Update watchlist
              </button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Rules" title="Create alert" />
            <div className="space-y-3">
              <select
                className={fieldClass}
                onChange={(event) => {
                  const next = event.target.value as EntityType
                  setAlertEntityType(next)
                  setAlertEntityId(options[next][0]?.value ?? '')
                }}
                value={alertEntityType}
              >
                <option value="pair">Pair</option>
                <option value="currency">Currency</option>
                <option value="event">Event</option>
                <option value="forecast">Forecast</option>
                <option value="simulation">Simulation</option>
                <option value="strategy">Strategy</option>
              </select>
              <select className={fieldClass} onChange={(event) => setAlertEntityId(event.target.value)} value={alertEntityId}>
                {options[alertEntityType].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select className={fieldClass} onChange={(event) => setAlertConditionType(event.target.value as AlertConditionType)} value={alertConditionType}>
                <option value="price_cross">Price cross</option>
                <option value="event_approaching">Event approaching</option>
                <option value="volatility_threshold">Volatility threshold</option>
                <option value="uncertainty_widening">Uncertainty widening</option>
                <option value="macro_risk_change">Macro risk change</option>
              </select>
              <input className={fieldClass} onChange={(event) => setThreshold(event.target.value)} placeholder="Threshold" value={threshold} />
              <button
                className="w-full bg-[color:var(--panel-2)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
                onClick={() =>
                  void appApi
                    .createAlert({
                      entityType: alertEntityType,
                      entityId: alertEntityId,
                      conditionType: alertConditionType,
                      threshold,
                    })
                    .then(async () => {
                      const nextAlerts = await appApi.listAlerts()
                      setData({ ...data, alerts: nextAlerts })
                    })
                }
                type="button"
              >
                Save alert rule
              </button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Signals" title="Active rules" />
            <div className="space-y-2">
              {activeAlerts.length ? (
                activeAlerts.slice(0, 5).map((alert) => (
                  <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5" key={alert.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text)]">
                        {linkedLabel(seed, alert.entityType, alert.entityId)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                        {alert.conditionType.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">{alert.threshold}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--muted)]">No active alert rules.</div>
              )}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Signals" title="Triggered alerts" />
            <div className="space-y-2">
              {triggeredAlerts.length ? (
                triggeredAlerts.map((alert) => (
                  <div className="rounded-[3px] border border-[rgba(227,128,120,0.16)] bg-[color:var(--panel-2)] px-3 py-3" key={alert.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--text)]">{linkedLabel(seed, alert.entityType, alert.entityId)}</div>
                      <span className="text-[11px] font-semibold text-[var(--danger)]">Triggered</span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {alert.conditionType} · {alert.threshold}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--muted)]">No triggered alerts.</div>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
