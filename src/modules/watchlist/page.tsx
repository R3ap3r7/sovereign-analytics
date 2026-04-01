import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { buildEntityLabel } from '../../domain/selectors'
import type { AlertConditionType, EntityType, WatchEntityType } from '../../domain/types'
import { useAsyncResource } from '../../lib/useAsyncResource'

export const WatchlistPage = () => {
  const seed = getSeed()
  const { data, loading, setData } = useAsyncResource(async () => {
    const seed = getSeed()
    const [watchlist, alerts] = await Promise.all([appApi.listWatchlistItems(), Promise.resolve(seed.alerts.filter((alert) => alert.userId === appApi.getCurrentUser()?.id))])
    return { watchlist, alerts }
  }, [])
  const [entityType, setEntityType] = useState<WatchEntityType>('pair')
  const [entityId, setEntityId] = useState('eur-usd')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [alertEntityType, setAlertEntityType] = useState<EntityType>('pair')
  const [alertConditionType, setAlertConditionType] = useState<AlertConditionType>('price_cross')
  const [alertEntityId, setAlertEntityId] = useState('eur-usd')
  const [threshold, setThreshold] = useState('1.0950')
  const options = {
    pair: seed.pairs.map((item) => ({ value: item.id, label: item.symbol })),
    currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` })),
    event: seed.events.map((item) => ({ value: item.id, label: item.title })),
    forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
    simulation: seed.simulations.map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} · ${item.scenarioType}` })),
    strategy: seed.strategies.map((item) => ({ value: item.id, label: item.name })),
  } satisfies Record<EntityType, Array<{ value: string; label: string }>>
  if (loading || !data) return <LoadingPanel label="Loading watchlist and alerts…" />
  return (
    <Page title="Watchlist & Alerts" description="Watched pairs, currencies, events, and forecasts feed dashboard relevance and the local notification model.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Watchlist" title="Tracked entities" />
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={entityType} onChange={(event) => {
              const next = event.target.value as WatchEntityType
              setEntityType(next)
              setEntityId(options[next][0]?.value ?? '')
            }}>
              <option value="pair">Pair</option>
              <option value="currency">Currency</option>
              <option value="event">Event</option>
              <option value="forecast">Forecast</option>
            </select>
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={entityId} onChange={(event) => setEntityId(event.target.value)}>
              {options[entityType].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button className="mb-4 rounded-full border border-[var(--line)] px-4 py-2 text-sm" onClick={() => void appApi.toggleWatchlist(entityType, entityId, priority).then((watchlist) => setData({ ...data, watchlist }))} type="button">
            Toggle watch item
          </button>
          <div className="space-y-3">
            {data.watchlist.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{buildEntityLabel(seed, item.entityType, item.entityId)}</div>
                  <div className="text-sm text-[var(--muted)]">{item.entityType} · {item.priority}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" to={appApi.getEntityHref(item.entityType, item.entityId)}>Open</Link>
                  <button className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => void appApi.toggleWatchlist(item.entityType, item.entityId).then((watchlist) => setData({ ...data, watchlist }))} type="button">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Alert rules" title="Re-evaluated locally" />
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={alertEntityType} onChange={(event) => {
              const next = event.target.value as EntityType
              setAlertEntityType(next)
              setAlertEntityId(options[next][0]?.value ?? '')
            }}>
              <option value="pair">Pair</option>
              <option value="currency">Currency</option>
              <option value="event">Event</option>
              <option value="forecast">Forecast</option>
              <option value="simulation">Simulation</option>
              <option value="strategy">Strategy</option>
            </select>
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={alertEntityId} onChange={(event) => setAlertEntityId(event.target.value)}>
              {options[alertEntityType].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={alertConditionType} onChange={(event) => setAlertConditionType(event.target.value as AlertConditionType)}>
              <option value="price_cross">Price cross</option>
              <option value="event_approaching">Event approaching</option>
              <option value="volatility_threshold">Volatility threshold</option>
              <option value="uncertainty_widening">Uncertainty widening</option>
              <option value="macro_risk_change">Macro risk change</option>
            </select>
            <input className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="Threshold" />
          </div>
          <button className="mb-4 rounded-full border border-[var(--line)] px-4 py-2 text-sm" onClick={() => void appApi.createAlert({ entityType: alertEntityType, entityId: alertEntityId, conditionType: alertConditionType, threshold }).then((alert) => setData({ ...data, alerts: [alert, ...data.alerts] }))} type="button">
            Create alert
          </button>
          <div className="space-y-3">
            {data.alerts.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.conditionType}</div>
                  <div className="text-sm text-[var(--muted)]">{item.status}</div>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">{buildEntityLabel(seed, item.entityType === 'simulation' || item.entityType === 'strategy' ? 'forecast' : item.entityType === 'forecast' ? 'forecast' : item.entityType, item.entityId)} · threshold {item.threshold}</div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => void appApi.updateAlert(item.id, { status: item.status === 'paused' ? 'active' : 'paused' }).then((updated) => setData({ ...data, alerts: data.alerts.map((alert) => alert.id === item.id ? updated : alert) }))} type="button">
                    {item.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => void appApi.dismissAlert(item.id).then(() => setData({ ...data, alerts: data.alerts.filter((alert) => alert.id !== item.id) }))} type="button">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
