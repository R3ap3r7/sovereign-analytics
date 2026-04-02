import { useMemo, useState } from 'react'
import { ForecastChart, PerformanceChart } from '../../components/charts/analytics'
import { LoadingPanel } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { getSeed } from '../../domain/services/api'
import { useAsyncResource } from '../../lib/useAsyncResource'

const tabClass = (active: boolean) =>
  active
    ? 'px-3 py-2 text-[11px] font-semibold text-[var(--accent)] bg-[color:var(--panel-3)]'
    : 'px-3 py-2 text-[11px] font-medium text-[var(--muted)] bg-[color:var(--panel)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

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
  const [entryTrigger, setEntryTrigger] = useState('Trend break + macro confirmation')
  const [exitTrigger, setExitTrigger] = useState('2R or structure failure')
  const [riskPerTrade, setRiskPerTrade] = useState('1.0')
  const [selectedScenarioId, setSelectedScenarioId] = useState('scenario-hawkish-fed')
  const performanceData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        label: `M${index + 1}`,
        equity: 100 + index * 2 + (index % 3 === 0 ? 4 : -1),
      })),
    [],
  )
  const heatmap = useMemo(
    () =>
      Array.from({ length: 3 }, (_, yearIndex) => ({
        year: 2024 - yearIndex,
        values: Array.from({ length: 12 }, (_, monthIndex) => ((monthIndex + yearIndex) % 5) - 2),
      })),
    [],
  )

  if (loading || !data) return <LoadingPanel label="Loading strategy lab…" />

  const selectedStrategy = data.strategies.find((item) => item.id === selectedStrategyId) ?? data.strategies[0]
  const selectedScenario = data.scenarios.find((item) => item.id === selectedScenarioId) ?? data.scenarios[0]

  return (
    <div className="space-y-6">
      <section className="bg-[color:var(--panel)] p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,10rem))]">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Strategy workstation</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--text)]">{selectedStrategy.name}</h1>
            <div className="mt-2 text-sm text-[var(--muted)]">{selectedStrategy.style} · {selectedStrategy.riskProfile}</div>
          </div>
          {[
            ['Sharpe', '1.8'],
            ['Win rate', '56%'],
            ['Drawdown', '-4.2R'],
            ['Regime fit', selectedStrategy.suitedRegimes[0] ?? '-'],
          ].map(([label, value]) => (
            <div className="bg-[color:var(--panel-2)] px-4 py-3" key={label}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
              <div className="mt-2 text-xl font-bold text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="flex flex-wrap gap-1 bg-[color:var(--panel-2)] p-1">
              {data.strategies.map((strategy) => (
                <button className={tabClass(strategy.id === selectedStrategy.id)} key={strategy.id} onClick={() => setSelectedStrategyId(strategy.id)} type="button">
                  {strategy.name}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="bg-[color:var(--panel)] p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Rule builder</h2>
                <div className="grid gap-4">
                  {[
                    ['Entry trigger', entryTrigger, setEntryTrigger],
                    ['Exit trigger', exitTrigger, setExitTrigger],
                    ['Risk per trade', riskPerTrade, setRiskPerTrade],
                  ].map(([label, value, setter]) => (
                    <label className="border-b border-[color:rgba(141,164,179,0.16)] pb-2" key={label as string}>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label as string}</div>
                      <input className="w-full border-none bg-transparent p-0 text-sm font-semibold text-[var(--text)] outline-none focus:ring-0" onChange={(event) => (setter as (value: string) => void)(event.target.value)} value={value as string} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-[color:var(--panel)] p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Strategy fit</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Suited pairs</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedStrategy.suitedPairs.map((pair) => (
                        <span className="bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)]" key={pair}>
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Suited regimes</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedStrategy.suitedRegimes.map((regime) => (
                        <span className="bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)]" key={regime}>
                          {regime}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="space-y-6">
              <section className="bg-[color:var(--panel)] p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Historical run</h2>
                <PerformanceChart data={performanceData} labelKey="label" valueKey="equity" />
                <div className="mt-4 grid gap-2 md:grid-cols-4">
                  {[
                    ['Sharpe', '1.8'],
                    ['Sortino', '2.3'],
                    ['Calmar', '1.4'],
                    ['Volatility', '8.1%'],
                  ].map(([label, value]) => (
                    <div className="bg-[color:var(--panel-2)] px-3 py-3" key={label}>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
                      <div className="mt-2 text-sm font-bold text-[var(--text)]">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[color:var(--panel)] p-6">
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Monthly heatmap</h2>
                <div className="space-y-2">
                  {heatmap.map((row) => (
                    <div className="grid grid-cols-[4rem_repeat(12,minmax(0,1fr))] gap-1" key={row.year}>
                      <div className="px-2 py-2 text-[11px] font-semibold text-[var(--muted)]">{row.year}</div>
                      {row.values.map((value, index) => (
                        <div
                          className={
                            value > 0
                              ? 'px-2 py-2 text-center text-[10px] font-bold text-[var(--accent)] bg-[rgba(105,211,192,0.12)]'
                              : value < 0
                                ? 'px-2 py-2 text-center text-[10px] font-bold text-[var(--danger)] bg-[rgba(227,128,120,0.12)]'
                                : 'px-2 py-2 text-center text-[10px] font-bold text-[var(--muted)] bg-[color:var(--panel-2)]'
                          }
                          key={`${row.year}-${index}`}
                        >
                          {value > 0 ? `+${value}` : value}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Regime lab</div>
            <div className="space-y-2">
              {data.scenarios.map((scenario) => (
                <button className={tabClass(scenario.id === selectedScenario.id)} key={scenario.id} onClick={() => setSelectedScenarioId(scenario.id)} type="button">
                  {scenario.name}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Scenario impact</div>
            <div className="space-y-2">
              {Object.entries(selectedScenario.pairEffects).map(([code, value]) => (
                <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-3 py-2.5" key={code}>
                  <span className="text-sm font-medium text-[var(--text)]">{code.replace(/-/g, '/').toUpperCase()}</span>
                  <span className={value >= 0 ? 'text-[11px] font-semibold text-[var(--accent)]' : 'text-[11px] font-semibold text-[var(--danger)]'}>
                    {value >= 0 ? '+' : ''}
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="mt-4 w-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--bg)]"
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
            </button>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Illustration</div>
            <ForecastChart forecast={data.forecast} />
          </section>
        </aside>
      </div>
    </div>
  )
}
