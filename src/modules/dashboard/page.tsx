import { Link } from 'react-router-dom'
import { StrengthChart } from '../../components/charts/analytics'
import { EventCard, NewsCard, NoteCard, PairCard } from '../../components/domain/cards'
import { ActionLink, Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatCurrency } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

export const DashboardPage = () => {
  const { user } = useAppState()
  const { data, loading } = useAsyncResource(() => appApi.getCurrentUserWorkspace(), [user?.id])
  if (loading || !data?.dashboard) return <LoadingPanel label="Loading dashboard workspace…" />
  const { dashboard } = data
  const exposure = dashboard.portfolio
    ? dashboard.portfolio.openPositions.reduce((acc, item) => acc + Math.abs(item.unrealizedPnL), 0)
    : 0

  return (
    <Page
      title="Dashboard"
      description="Personalized macro and pair overview assembled from your favorites, watchlist, portfolio state, and saved analysis."
      actions={<Badge tone="warning">{user?.settings.dashboardMode}</Badge>}
    >
      <Panel className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <SectionTitle eyebrow="Session summary" title={`Welcome back, ${user?.displayName}`} detail={dashboard.summary} />
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Preferred account" value={user?.settings.defaultAccountCurrency} help="Used as the simulation default across the app." />
            <Stat label="Active watch focus" value={dashboard.watchlist.length} help="Watched entities driving dashboard prioritization." />
            <Stat label="Largest live focus" value={dashboard.highlightedPairs[0]?.symbol ?? 'EUR/USD'} help="Highest-ranked pair among favorites and watched items." />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Portfolio equity" tone="up" value={formatCurrency(dashboard.portfolio?.portfolio.equity ?? 0)} help="Paper-account equity including open P/L." />
          <Stat label="Open risk pulse" value={formatCurrency(exposure)} help="Quick proxy for open position attention load." />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <SectionTitle eyebrow="Currency strength" title="Major currency composite ranking" detail="Shared composite score used on dashboard, currency pages, pair narratives, and forecast context." />
          <StrengthChart data={dashboard.strength.slice(0, 8)} />
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Priority events" title="High-impact event board" detail="Items affecting watched currencies and favorite pairs float to the top." />
          <div className="space-y-3">
            {dashboard.events.slice(0, 3).map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle eyebrow="Favorite pairs" title="Major and watched pairs" />
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.highlightedPairs.map((pair) => (
              <PairCard
                key={pair.id}
                href={`/app/markets/${pair.id}`}
                meta={<div className="flex justify-between text-[var(--muted)]"><span>Carry {pair.carryScore}</span><span>Event risk {pair.eventRiskBase}</span></div>}
                pair={pair}
                subtitle={pair.narrative}
              />
            ))}
          </div>
        </div>
        <Panel>
          <SectionTitle eyebrow="Recent simulations" title="Continue scenario work" />
          <div className="space-y-3">
            {dashboard.simulations.map((simulation) => (
              <Link className="block rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={simulation.id} to={`/app/simulation?simulation=${simulation.id}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{simulation.pairId.toUpperCase()}</div>
                  <Badge tone={simulation.direction === 'long' ? 'accent' : 'danger'}>{simulation.direction}</Badge>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">{simulation.scenarioType}</div>
                <div className="mt-3 text-sm">Net {formatCurrency(simulation.outputs.netPnL)}</div>
              </Link>
            ))}
            <ActionLink to="/app/simulation">Open simulation lab</ActionLink>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Forecast strip" title="Illustrative outlooks" />
          <div className="space-y-3">
            {dashboard.forecasts.map((forecast) => (
              <Link className="block rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={forecast.id} to="/app/forecast">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{forecast.pairId.toUpperCase()}</div>
                  <div className="text-sm text-[var(--muted)]">Confidence {Math.round(forecast.confidence)}%</div>
                </div>
                <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{forecast.disclaimer}</div>
              </Link>
            ))}
          </div>
        </Panel>
        <div>
          <SectionTitle eyebrow="Narrative stream" title="News impact and saved notes" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              {dashboard.news.slice(0, 3).map((item) => (
                <NewsCard item={item} key={item.id} />
              ))}
            </div>
            <div className="space-y-4">
              {dashboard.notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  )
}
