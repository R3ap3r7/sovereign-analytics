import { useMemo, useState } from 'react'
import { ForecastChart, PerformanceChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { getSeed } from '../../domain/services/mockApi'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

const chipClass =
  'border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const fieldClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const Label = ({ children }: { children: string }) => (
  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{children}</div>
)

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
  const [entryTrigger, setEntryTrigger] = useState('trend trigger')
  const [exitTrigger, setExitTrigger] = useState('2R or reversal')
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
  const strategyPairs = selectedStrategy.suitedPairs.slice(0, 4).join(' · ')
  const regimeTags = selectedStrategy.suitedRegimes.slice(0, 4).join(' · ')

  return (
    <Page title="Strategy Lab">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel className="overflow-hidden p-0">
          <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-[color:var(--panel-2)] px-5 py-5">
              <Label>Strategy workspace</Label>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{selectedStrategy.name}</h2>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {selectedStrategy.style} · {selectedStrategy.riskProfile}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Templates" value={data.strategies.length} />
                <Stat label="Scenarios" value={data.scenarios.length} />
                <Stat label="Mock run" value="Live" />
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Pairs</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{strategyPairs}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Regimes</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{regimeTags}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Entry</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{selectedStrategy.entryLogic}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Exit</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{selectedStrategy.exitLogic}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Status" title="Current frame" />
          <div className="grid gap-px bg-[var(--line)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Strategy</Label>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedStrategy.name}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Market fit</Label>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedStrategy.style}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Risk</Label>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedStrategy.riskProfile}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Scenario</Label>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedScenario.name}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel>
          <SectionTitle eyebrow="Templates" title="Strategy set" />
          <div className="mb-4 flex flex-wrap gap-2">
            {data.strategies.map((strategy) => (
              <button
                className={[
                  chipClass,
                  strategy.id === selectedStrategy.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'text-[var(--muted)]',
                ].join(' ')}
                key={strategy.id}
                onClick={() => setSelectedStrategyId(strategy.id)}
                type="button"
              >
                {strategy.name}
              </button>
            ))}
          </div>
          <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Intent</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedStrategy.entryLogic}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Exit logic</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedStrategy.exitLogic}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Pairs</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedStrategy.suitedPairs.join(' · ')}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Regimes</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedStrategy.suitedRegimes.join(' · ')}</div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Build" title="Rule blocks" />
          <div className="grid gap-3">
            <label className="block">
              <Label>Entry trigger</Label>
              <input className={fieldClass} value={entryTrigger} onChange={(event) => setEntryTrigger(event.target.value)} />
            </label>
            <label className="block">
              <Label>Exit trigger</Label>
              <input className={fieldClass} value={exitTrigger} onChange={(event) => setExitTrigger(event.target.value)} />
            </label>
            <label className="block">
              <Label>Risk per trade</Label>
              <input className={fieldClass} value={riskPerTrade} onChange={(event) => setRiskPerTrade(event.target.value)} />
            </label>
            <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Entry</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{entryTrigger}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Exit</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{exitTrigger}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Risk</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{riskPerTrade}%</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Review" title="Historical run" />
          <ForecastChart forecast={data.forecast} />
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Stat label="Win rate" value="54%" />
            <Stat label="Best run" value="+7.8R" />
            <Stat label="Worst drawdown" value="-5.2R" />
            <Stat label="Monthly split" value="8 / 4" />
          </div>
          <div className="mt-4">
            <PerformanceChart data={performanceData} labelKey="label" valueKey="equity" />
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Sandbox" title="Regime presets" />
          <div className="mb-4 flex flex-wrap gap-2">
            {data.scenarios.map((scenario) => (
              <button
                className={[
                  chipClass,
                  scenario.id === selectedScenario.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'text-[var(--muted)]',
                ].join(' ')}
                key={scenario.id}
                onClick={() => setSelectedScenarioId(scenario.id)}
                type="button"
              >
                {scenario.name}
              </button>
            ))}
          </div>
          <div className="grid gap-px bg-[var(--line)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Selected</Label>
              <div className="mt-2 text-sm text-[var(--text)]">{selectedScenario.name}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Description</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selectedScenario.description}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Currency shifts</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">
                {Object.entries(selectedScenario.currencyEffects)
                  .map(([code, value]) => `${code} ${value > 0 ? '+' : ''}${value}`)
                  .join(' · ')}
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Pair shifts</Label>
              <div className="mt-2 text-sm leading-6 text-[var(--text)]">
                {Object.entries(selectedScenario.pairEffects)
                  .map(([code, value]) => `${code} ${value > 0 ? '+' : ''}${value}`)
                  .join(' · ')}
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <Label>Apply</Label>
              <div className="mt-3">
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
                        ...Object.fromEntries(
                          Object.keys(selectedScenario.pairEffects).map((pairId) => [pairId, Math.abs(selectedScenario.pairEffects[pairId]) * 2]),
                        ),
                      },
                      newsToneShifts: {
                        ...adminMutation.newsToneShifts,
                        ...selectedScenario.newsToneShifts,
                      },
                    })
                  }
                  type="button"
                >
                  Apply scenario
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  )
}
