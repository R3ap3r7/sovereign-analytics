import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { buildEntityLabel } from '../../domain/selectors'
import type { AlertConditionType, EntityType, WatchEntityType, WatchlistItem } from '../../domain/types'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { PrimaryButton } from '../shared'

const fieldClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const actionClass =
  'inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.45)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const compactButtonClass =
  'inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.45)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const priorityTone = (priority: WatchlistItem['priority']) => (priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'default')

const alertTone = (status: string) => {
  if (status === 'triggered') return 'danger'
  if (status === 'active') return 'accent'
  return 'default'
}

const priorityRank = (priority: WatchlistItem['priority']) => (priority === 'high' ? 2 : priority === 'medium' ? 1 : 0)

const linkedLabel = (seed: ReturnType<typeof getSeed>, entityType: EntityType, entityId: string) => {
  if (entityType === 'forecast') {
    const forecast = seed.forecasts.find((item) => item.id === entityId)
    return forecast ? `${forecast.pairId.toUpperCase()} | forecast` : entityId
  }
  if (entityType === 'simulation') {
    const simulation = seed.simulations.find((item) => item.id === entityId)
    return simulation ? `${simulation.pairId.toUpperCase()} | ${simulation.scenarioType}` : entityId
  }
  if (entityType === 'strategy') {
    return seed.strategies.find((item) => item.id === entityId)?.name ?? entityId
  }
  return buildEntityLabel(seed, entityType, entityId)
}

export const WatchlistPage = () => {
  const seed = getSeed()
  const { data, loading, setData } = useAsyncResource(async () => {
    const runtime = getSeed()
    const [watchlist, alerts] = await Promise.all([
      appApi.listWatchlistItems(),
      Promise.resolve(runtime.alerts.filter((alert) => alert.userId === appApi.getCurrentUser()?.id)),
    ])
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
        currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} | ${item.name}` })),
        event: seed.events.map((item) => ({ value: item.id, label: item.title })),
        forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
        simulation: seed.simulations.map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} | ${item.scenarioType}` })),
        strategy: seed.strategies.map((item) => ({ value: item.id, label: item.name })),
      }) satisfies Record<EntityType, Array<{ value: string; label: string }>>,
    [seed],
  )

  const watchlist = data?.watchlist ?? []
  const alerts = data?.alerts ?? []
  const filteredWatchlist = useMemo(() => {
    const items = [...watchlist]
      .filter((item) => (view === 'all' ? true : item.entityType === view))
      .filter((item) => (priorityFilter === 'all' ? true : item.priority === priorityFilter))
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.entityType.localeCompare(b.entityType))
    return items
  }, [priorityFilter, view, watchlist])

  const triggeredAlerts = alerts.filter((item) => item.status === 'triggered')
  const activeAlerts = alerts.filter((item) => item.status === 'active')
  const watchedPairs = watchlist.filter((item) => item.entityType === 'pair').length
  const watchedCurrencies = watchlist.filter((item) => item.entityType === 'currency').length
  const watchedEvents = watchlist.filter((item) => item.entityType === 'event').length
  const watchedForecasts = watchlist.filter((item) => item.entityType === 'forecast').length
  const coverageItems = filteredWatchlist.slice(0, 4)

  if (loading || !data) return <LoadingPanel label="Loading watchlist…" />

  const watchlistEntitySummary = [
    { label: 'Pairs', value: watchedPairs },
    { label: 'Currencies', value: watchedCurrencies },
    { label: 'Events', value: watchedEvents },
    { label: 'Forecasts', value: watchedForecasts },
  ]

  return (
    <Page title="Watchlist" description="Tracked entities and local alert rules.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_20rem]">
        <Panel className="overflow-hidden p-0">
          <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-[color:var(--panel-2)] px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Live board</div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">Tracking state</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Pairs | currencies | events | forecasts</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {watchlistEntitySummary.map((item) => (
                  <Badge key={item.label} tone="default">
                    {item.label} {item.value}
                  </Badge>
                ))}
                <Badge tone={triggeredAlerts.length ? 'danger' : 'accent'}>{triggeredAlerts.length ? 'Triggered' : 'Stable'} {triggeredAlerts.length}</Badge>
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <Stat label="Tracked" value={watchlist.length} help="Active watch entries." />
              <Stat label="Alerts" value={alerts.length} help="Local rule objects." />
              <Stat label="Active" value={activeAlerts.length} help="Live alert rules." />
              <Stat label="Triggered" value={triggeredAlerts.length} help="Events needing attention." tone={triggeredAlerts.length ? 'down' : 'flat'} />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Coverage" title="Priority lanes" />
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-1">
            {coverageItems.length ? (
              coverageItems.map((item) => {
                const label = linkedLabel(seed, item.entityType === 'forecast' ? 'forecast' : item.entityType, item.entityId)
                const href = appApi.getEntityHref(item.entityType, item.entityId)
                return (
                  <div className="bg-[color:var(--panel-2)] px-4 py-4" key={`${item.entityType}-${item.entityId}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-[1.05rem] font-semibold tracking-[-0.03em]">{label}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {item.entityType} | {item.priority}
                        </div>
                      </div>
                      <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link className={actionClass} to={href}>
                        Open
                      </Link>
                      {item.entityType === 'pair' ? (
                        <Link className={actionClass} to={`/app/simulation?pair=${item.entityId}`}>
                          Sim
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-[color:var(--panel-2)] px-4 py-4 text-sm text-[var(--muted)]">No priority lanes.</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_20rem]">
        <Panel>
          <SectionTitle eyebrow="Tracked" title="Entity list" detail="Use the selectors to add or remove what the workspace watches." />
          <div className="grid gap-3 border-b border-[var(--line)] pb-4 lg:grid-cols-[0.75fr_1fr_0.7fr_0.45fr_auto]">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Entity</div>
              <select
                className={fieldClass}
                value={entityType}
                onChange={(event) => {
                  const next = event.target.value as WatchEntityType
                  setEntityType(next)
                  setEntityId(options[next][0]?.value ?? '')
                }}
              >
                <option value="pair">Pair</option>
                <option value="currency">Currency</option>
                <option value="event">Event</option>
                <option value="forecast">Forecast</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Target</div>
              <select className={fieldClass} value={entityId} onChange={(event) => setEntityId(event.target.value)}>
                {options[entityType].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Priority</div>
              <select className={fieldClass} value={priority} onChange={(event) => setPriority(event.target.value as WatchlistItem['priority'])}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">View</div>
              <select className={fieldClass} value={view} onChange={(event) => setView(event.target.value as 'all' | WatchEntityType)}>
                <option value="all">All</option>
                <option value="pair">Pair</option>
                <option value="currency">Currency</option>
                <option value="event">Event</option>
                <option value="forecast">Forecast</option>
              </select>
            </label>
            <PrimaryButton onClick={() => void appApi.toggleWatchlist(entityType, entityId, priority).then((watchlistItems) => setData({ ...data, watchlist: watchlistItems }))} type="button">
              Track
            </PrimaryButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['all', 'high', 'medium', 'low'] as const).map((item) => (
              <button
                className={[
                  compactButtonClass,
                  priorityFilter === item ? 'border-[var(--accent)] text-[var(--accent)]' : '',
                ].join(' ')}
                key={item}
                onClick={() => setPriorityFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {filteredWatchlist.length ? (
              filteredWatchlist.map((item) => {
                const href = appApi.getEntityHref(item.entityType, item.entityId)
                const label = linkedLabel(seed, item.entityType === 'forecast' ? 'forecast' : item.entityType, item.entityId)
                return (
                  <div className="grid gap-3 border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)] md:grid-cols-[minmax(0,1.4fr)_0.55fr_0.6fr_auto] md:items-center" key={item.id}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-display text-[1.05rem] font-semibold tracking-[-0.03em]">{label}</div>
                        <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {item.entityType} | {item.entityId}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      <div className="text-[var(--text)]">{item.entityType}</div>
                      <div className="mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm text-[var(--muted)]">{item.entityType === 'pair' ? 'Simulation ready' : 'Tracked'}</div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link className={actionClass} to={href}>
                        Open
                      </Link>
                      {item.entityType === 'pair' ? (
                        <Link className={actionClass} to={`/app/simulation?pair=${item.entityId}`}>
                          Sim
                        </Link>
                      ) : null}
                      <button
                        className={actionClass}
                        onClick={() => void appApi.toggleWatchlist(item.entityType, item.entityId).then((watchlistItems) => setData({ ...data, watchlist: watchlistItems }))}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-6 text-sm text-[var(--muted)]">No tracked items for this filter.</div>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Alert rules" title="Local triggers" detail="Rules update against the same seeded market state." />
          <div className="grid gap-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Entity type</div>
              <select
                className={fieldClass}
                value={alertEntityType}
                onChange={(event) => {
                  const next = event.target.value as EntityType
                  setAlertEntityType(next)
                  setAlertEntityId(options[next][0]?.value ?? '')
                }}
              >
                <option value="pair">Pair</option>
                <option value="currency">Currency</option>
                <option value="event">Event</option>
                <option value="forecast">Forecast</option>
                <option value="simulation">Simulation</option>
                <option value="strategy">Strategy</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Entity</div>
              <select className={fieldClass} value={alertEntityId} onChange={(event) => setAlertEntityId(event.target.value)}>
                {options[alertEntityType].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Condition</div>
              <select className={fieldClass} value={alertConditionType} onChange={(event) => setAlertConditionType(event.target.value as AlertConditionType)}>
                <option value="price_cross">Price cross</option>
                <option value="event_approaching">Event approaching</option>
                <option value="volatility_threshold">Volatility threshold</option>
                <option value="uncertainty_widening">Uncertainty widening</option>
                <option value="macro_risk_change">Macro risk change</option>
              </select>
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Threshold</div>
              <input className={fieldClass} value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="Threshold" />
            </label>
            <PrimaryButton
              onClick={() =>
                void appApi.createAlert({
                  entityType: alertEntityType,
                  entityId: alertEntityId,
                  conditionType: alertConditionType,
                  threshold,
                }).then((alert) => setData({ ...data, alerts: [alert, ...data.alerts] }))
              }
              type="button"
            >
              Create alert
            </PrimaryButton>
          </div>

          <div className="mt-4 space-y-2">
            {alerts.length ? (
              alerts.map((item) => {
                const displayType = item.entityType === 'simulation' || item.entityType === 'strategy' ? 'forecast' : item.entityType === 'forecast' ? 'forecast' : item.entityType
                return (
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-display text-[1rem] font-semibold tracking-[-0.03em]">{item.conditionType}</div>
                          <Badge tone={alertTone(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {linkedLabel(seed, displayType, item.entityId)} | {item.threshold}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{new Date(item.lastEvaluation).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className={actionClass}
                        onClick={() => void appApi.updateAlert(item.id, { status: item.status === 'paused' ? 'active' : 'paused' }).then((updated) => setData({ ...data, alerts: data.alerts.map((alert) => (alert.id === item.id ? updated : alert)) }))}
                        type="button"
                      >
                        {item.status === 'paused' ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        className={actionClass}
                        onClick={() => void appApi.dismissAlert(item.id).then(() => setData({ ...data, alerts: data.alerts.filter((alert) => alert.id !== item.id) }))}
                        type="button"
                      >
                        Dismiss
                      </button>
                      <Link className={actionClass} to={appApi.getEntityHref(displayType === 'forecast' ? 'forecast' : displayType, item.entityId)}>
                        Open
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-6 text-sm text-[var(--muted)]">No alert rules yet.</div>
            )}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
