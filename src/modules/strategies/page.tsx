import { useMemo, useState } from 'react'
import { ForecastChart, PerformanceChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { getSeed } from '../../domain/services/mockApi'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const StrategyLabPage = () => {
  const { adminMutation, setAdminMutation } = useAppState()
  const { data, loading } = useAsyncResource(async () => {
    const seed = getSeed()
    return {
      strategies: seed.strategies,
      scenarios: seed.scenarios,
      forecast: seed.forecasts[0],
    }
  }, [])
  const [selectedStrategyId, setSelectedStrategyId] = useState('strategy-trend-breakout')
  const [entryTrigger, setEntryTrigger] = useState('moving-average crossover')
  const [exitTrigger, setExitTrigger] = useState('2R or signal reversal')
  const [riskPerTrade, setRiskPerTrade] = useState('1.0')
  const [selectedScenarioId, setSelectedScenarioId] = useState('scenario-hawkish-fed')
  const performanceData = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({
      label: `M${index + 1}`,
      equity: 100 + index * 2 + (index % 3 === 0 ? 4 : -1),
      drawdown: Math.max(0, 8 - index / 1.5),
    })),
    [],
  )
  if (loading || !data) return <LoadingPanel label="Loading strategy lab…" />
  const selectedStrategy = data.strategies.find((item) => item.id === selectedStrategyId) ?? data.strategies[0]
  const selectedScenario = data.scenarios.find((item) => item.id === selectedScenarioId) ?? data.scenarios[0]
  return (
    <Page title="Strategy Lab" description="Explore rule-based strategy structures, mock historical review, and macro regime overlays without pretending to run a real backtest engine.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Templates" title="Strategy concepts" />
          <div className="mb-4 flex flex-wrap gap-2">
            {data.strategies.map((strategy) => (
              <button className={`rounded-full border px-3 py-1.5 text-xs ${strategy.id === selectedStrategy.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'}`} key={strategy.id} onClick={() => setSelectedStrategyId(strategy.id)} type="button">
                {strategy.name}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">
              <div className="font-semibold">{selectedStrategy.name}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{selectedStrategy.style} · {selectedStrategy.riskProfile}</div>
              <div className="mt-3 text-sm text-[var(--muted)]">{selectedStrategy.entryLogic}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">{selectedStrategy.exitLogic}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">Suited pairs: {selectedStrategy.suitedPairs.join(', ')}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">Regimes: {selectedStrategy.suitedRegimes.join(', ')}</div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">
              <div className="font-semibold">Rule builder</div>
              <div className="mt-3 grid gap-3">
                <input className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm" value={entryTrigger} onChange={(event) => setEntryTrigger(event.target.value)} />
                <input className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm" value={exitTrigger} onChange={(event) => setExitTrigger(event.target.value)} />
                <input className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm" value={riskPerTrade} onChange={(event) => setRiskPerTrade(event.target.value)} />
                <div className="text-sm text-[var(--muted)]">Entry: {entryTrigger}. Exit: {exitTrigger}. Risk per trade: {riskPerTrade}%.</div>
              </div>
            </div>
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
          <div className="mt-4">
            <PerformanceChart data={performanceData} labelKey="label" valueKey="equity" />
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionTitle eyebrow="Macro scenario sandbox" title="Regime presets" detail="These presets are designed to mutate outlooks and risk tags across the app when connected to the admin/demo overlay layer." />
        <div className="mb-4 flex flex-wrap gap-2">
          {data.scenarios.map((scenario) => (
            <button className={`rounded-full border px-3 py-1.5 text-xs ${scenario.id === selectedScenario.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'}`} key={scenario.id} onClick={() => setSelectedScenarioId(scenario.id)} type="button">
              {scenario.name}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4 md:col-span-2">
            <div className="font-semibold">{selectedScenario.name}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">{selectedScenario.description}</div>
            <div className="mt-3 text-sm text-[var(--muted)]">Currency effects: {Object.entries(selectedScenario.currencyEffects).map(([code, value]) => `${code} ${value > 0 ? '+' : ''}${value}`).join(', ')}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Pair effects: {Object.entries(selectedScenario.pairEffects).map(([code, value]) => `${code} ${value > 0 ? '+' : ''}${value}`).join(', ')}</div>
            <div className="mt-4">
              <PrimaryButton
                onClick={() =>
                  void setAdminMutation({
                    ...adminMutation,
                    currencyShifts: {
                      ...adminMutation.currencyShifts,
                      ...selectedScenario.currencyEffects,
                    },
                    pairVolatilityShifts: {
                      ...adminMutation.pairVolatilityShifts,
                      ...Object.fromEntries(Object.keys(selectedScenario.pairEffects).map((pairId) => [pairId, Math.abs(selectedScenario.pairEffects[pairId]) * 2])),
                    },
                    newsToneShifts: {
                      ...adminMutation.newsToneShifts,
                      ...selectedScenario.newsToneShifts,
                    },
                  })
                }
                type="button"
              >
                Apply scenario to demo state
              </PrimaryButton>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">
            <div className="font-semibold">Expected outcome</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Forecast overlays and event-risk badges will respond across the connected pair pages after the scenario is applied.</div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">
            <div className="font-semibold">Historical viewer mock</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Use the performance curve above as the structure for future backtest visualizations with entries, exits, and drawdown panels.</div>
          </div>
        </div>
      </Panel>
    </Page>
  )
}
