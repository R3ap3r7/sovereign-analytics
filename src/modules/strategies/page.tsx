import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { getSeed } from '../../domain/services/mockApi'
import { useAsyncResource } from '../../lib/useAsyncResource'

export const StrategyLabPage = () => {
  const { data, loading } = useAsyncResource(async () => {
    const seed = getSeed()
    return {
      strategies: seed.strategies,
      scenarios: seed.scenarios,
      forecast: seed.forecasts[0],
    }
  }, [])
  if (loading || !data) return <LoadingPanel label="Loading strategy lab…" />
  return (
    <Page title="Strategy Lab" description="Explore rule-based strategy structures, mock historical review, and macro regime overlays without pretending to run a real backtest engine.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Templates" title="Strategy concepts" />
          <div className="grid gap-4 md:grid-cols-2">
            {data.strategies.map((strategy) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={strategy.id}>
                <div className="font-semibold">{strategy.name}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{strategy.style} · {strategy.riskProfile}</div>
                <div className="mt-3 text-sm text-[var(--muted)]">{strategy.entryLogic}</div>
                <div className="mt-2 text-sm text-[var(--muted)]">{strategy.exitLogic}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Illustrative viewer" title="Historical simulation structure" />
          <ForecastChart forecast={data.forecast} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Stat label="Win rate" value="54%" />
            <Stat label="Best run" value="+7.8R" />
            <Stat label="Worst drawdown" value="-5.2R" />
            <Stat label="Monthly heatmap" value="8 positive / 4 negative" />
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionTitle eyebrow="Macro scenario sandbox" title="Regime presets" detail="These presets are designed to mutate outlooks and risk tags across the app when connected to the admin/demo overlay layer." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.scenarios.map((scenario) => (
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={scenario.id}>
              <div className="font-semibold">{scenario.name}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">{scenario.description}</div>
            </div>
          ))}
        </div>
      </Panel>
    </Page>
  )
}
