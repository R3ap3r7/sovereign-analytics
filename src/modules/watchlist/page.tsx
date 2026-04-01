import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { useAsyncResource } from '../../lib/useAsyncResource'

export const WatchlistPage = () => {
  const { data, loading } = useAsyncResource(async () => {
    const seed = getSeed()
    const [watchlist, alerts] = await Promise.all([appApi.listWatchlistItems(), Promise.resolve(seed.alerts.filter((alert) => alert.userId === appApi.getCurrentUser()?.id))])
    return { watchlist, alerts }
  }, [])
  if (loading || !data) return <LoadingPanel label="Loading watchlist and alerts…" />
  return (
    <Page title="Watchlist & Alerts" description="Watched pairs, currencies, events, and forecasts feed dashboard relevance and the local notification model.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Watchlist" title="Tracked entities" />
          <div className="space-y-3">
            {data.watchlist.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.entityId}</div>
                  <div className="text-sm text-[var(--muted)]">{item.entityType}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Alert rules" title="Re-evaluated locally" />
          <div className="space-y-3">
            {data.alerts.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.conditionType}</div>
                  <div className="text-sm text-[var(--muted)]">{item.status}</div>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">{item.entityId} · threshold {item.threshold}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
