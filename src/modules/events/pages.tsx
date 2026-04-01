import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventCard, NewsCard } from '../../components/domain/cards'
import { ActionLink, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatDateTime } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

export const EventsPage = () => {
  const { data, loading } = useAsyncResource(() => Promise.all([appApi.listEvents(), appApi.listNews()]).then(([events, news]) => ({ events, news })), [])
  if (loading || !data) return <LoadingPanel label="Loading news and events…" />
  return (
    <Page title="News & Events" description="Track macro narratives, economic releases, and pair-specific impact from one shared event and news model.">
      <Panel>
        <SectionTitle eyebrow="Narrative summary" title="Current market focus" detail="USD remains yield-supported, JPY event risk is elevated, and commodity-linked currencies respond to China and energy headlines." />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <SectionTitle eyebrow="Calendar" title="Economic events" />
          <div className="space-y-4">
            {data.events.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="News stream" title="Why it matters" />
          <div className="space-y-4">
            {data.news.map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

export const EventDetailPage = () => {
  const { setActiveSimulation } = useAppState()
  const navigate = useNavigate()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getEventWorkspace(params.eventId ?? ''), [params.eventId])
  if (loading || !data) return <LoadingPanel label="Loading event inspector…" />
  return (
    <Page title={data.event.title} description="Inspect the event itself, linked currencies and pairs, directional scenario cards, and simulation entry points.">
      <Panel className="grid gap-4 lg:grid-cols-4">
        <Stat label="Region" value={data.event.region} />
        <Stat label="Timing" value={formatDateTime(data.event.scheduledAt)} />
        <Stat label="Impact" value={data.event.impact} />
        <Stat label="Urgency" value={data.event.urgency} help="High urgency floats the event upward on the dashboard and pair pages." />
      </Panel>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Scenario cards" title="Directional outcomes" />
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4 text-sm">Stronger-than-expected: favors the domestic currency and increases repricing conviction.</div>
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4 text-sm">In-line outcome: keeps the existing macro narrative dominant unless positioning is extreme.</div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/8 p-4 text-sm">Weaker-than-expected: challenges the current narrative and increases reversal risk in linked pairs.</div>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Affected pairs" title="Quick launch paths" />
          <div className="space-y-3">
            {data.pairs.map((pair) => (
              <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={pair.id}>
                <div>
                  <div className="font-medium">{pair.symbol}</div>
                  <div className="text-sm text-[var(--muted)]">{pair.narrative}</div>
                </div>
                <div className="flex gap-2">
                  <ActionLink to={`/app/markets/${pair.id}`}>Open pair</ActionLink>
                  <button
                    className="rounded-full border border-[var(--line)] px-3 py-2 text-xs"
                    onClick={() => {
                      setActiveSimulation(appApi.buildSimulationFromPair(pair.id))
                      navigate(`/app/simulation?pair=${pair.id}`)
                    }}
                    type="button"
                  >
                    Simulate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Affected currencies" title="Macro linkage" />
          <div className="space-y-3">
            {data.currencies.map((currency) => (
              <Link className="block rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={currency.code} to={`/app/currencies/${currency.code}`}>
                <div className="font-medium">{currency.code}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{currency.currentSummary}</div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Comparable events" title="Context and related news" />
          <div className="space-y-4">
            {data.comparableEvents.map((event) => (
              <div className="rounded-2xl border border-[var(--line)] px-4 py-3" key={event.id}>
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-[var(--muted)]">{event.scenarioNarrative}</div>
              </div>
            ))}
            {data.relatedNews.map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
