import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { generateMonteCarloSummary, calculateTradeOutputs } from '../../domain/calculators'
import { appApi, getSeed } from '../../domain/services/mockApi'
import type { Simulation } from '../../domain/types'
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const SimulationLabPage = () => {
  const { user, activeSimulation, setActiveSimulation } = useAppState()
  const [searchParams] = useSearchParams()
  const pairId = searchParams.get('pair')
  const simulationId = searchParams.get('simulation')
  const { data, loading } = useAsyncResource(async () => {
    const seed = getSeed()
    const saved = seed.simulations.find((item) => item.id === simulationId)
    const simulation = activeSimulation ?? saved ?? appApi.buildSimulationFromPair(pairId ?? user?.favoritePairs[0] ?? 'eur-usd')
    return {
      simulation,
      seed,
      forecast: seed.forecasts.find((item) => item.pairId === simulation.pairId)!,
      pair: seed.pairs.find((item) => item.id === simulation.pairId)!,
      savedSimulations: seed.simulations.filter((item) => item.userId === user?.id),
    }
  }, [user?.id, pairId, simulationId, activeSimulation?.id])

  const [draft, setDraft] = useState<Simulation | null>(null)
  const simulation = draft ?? data?.simulation ?? null

  const outputs = useMemo(() => {
    if (!simulation || !data?.pair) return null
    return calculateTradeOutputs({
      symbol: data.pair.symbol,
      direction: simulation.direction,
      capital: simulation.capital,
      leverage: simulation.leverage,
      entry: simulation.entry,
      exit: simulation.exit,
      stopLoss: simulation.stopLoss,
      takeProfit: simulation.takeProfit,
      positionSize: simulation.positionSize,
      spread: simulation.spread,
      fees: simulation.fees,
    })
  }, [simulation, data?.pair])

  const monteCarlo = useMemo(
    () =>
      generateMonteCarloSummary({
        capital: simulation?.capital ?? 25000,
        trades: 28,
        winRate: 0.52,
        averageR: 1.8,
        riskPerTrade: 1.2,
        streakIntensity: 2,
      }),
    [simulation?.capital],
  )

  if (loading || !simulation || !data || !outputs) return <LoadingPanel label="Loading simulation lab…" />

  const update = <K extends keyof Simulation>(key: K, value: Simulation[K]) => {
    setDraft({ ...simulation, [key]: value, outputs })
  }

  return (
    <Page
      title="Simulation Lab"
      description="A connected scenario workspace for trade outcomes, margin stress, size guidance, event presets, Monte Carlo demo paths, and saved simulation history."
      actions={
        <PrimaryButton
          onClick={async () => {
            const next = { ...simulation, outputs, updatedAt: new Date().toISOString() }
            await appApi.saveSimulation(next)
            setActiveSimulation(next)
          }}
          type="button"
        >
          Save simulation
        </PrimaryButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Quick position simulator" title={`${data.pair.symbol} active scenario`} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--muted)]">Capital
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.capital} onChange={(event) => update('capital', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Leverage
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.leverage} onChange={(event) => update('leverage', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Entry
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.entry} onChange={(event) => update('entry', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Exit
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.exit} onChange={(event) => update('exit', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Stop loss
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.stopLoss} onChange={(event) => update('stopLoss', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Take profit
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.takeProfit} onChange={(event) => update('takeProfit', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Position size
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" type="number" value={simulation.positionSize} onChange={(event) => update('positionSize', Number(event.target.value))} />
            </label>
            <label className="text-sm text-[var(--muted)]">Direction
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={simulation.direction} onChange={(event) => update('direction', event.target.value as Simulation['direction'])}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Stat label="Gross P/L" tone={outputs.grossPnL >= 0 ? 'up' : 'down'} value={formatCurrency(outputs.grossPnL)} />
            <Stat label="Net P/L" tone={outputs.netPnL >= 0 ? 'up' : 'down'} value={formatCurrency(outputs.netPnL)} />
            <Stat label="Pip move" value={formatNumber(outputs.pipMove, 1)} />
            <Stat label="Risk amount" value={formatCurrency(outputs.riskAmount)} />
            <Stat label="Reward amount" value={formatCurrency(outputs.rewardAmount)} />
            <Stat label="R multiple" value={formatNumber(outputs.rMultiple)} />
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Forecast context" title="Illustrative path for the selected pair" />
          <ForecastChart forecast={data.forecast} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Stat label="Margin used" value={formatCurrency(outputs.marginUsed)} help="Notional exposure divided by leverage." />
            <Stat label="Free margin" value={formatCurrency(outputs.freeMargin)} help="Capital remaining after margin allocation." />
            <Stat label="Breakeven drag" value={formatCurrency(simulation.fees + simulation.spread * outputs.pipValue)} help="Spread and fees widen the move needed to break even." />
            <Stat label="Drawdown at stop" value={formatCurrency(outputs.drawdownAtStop)} help="Stop-distance loss in account currency terms." />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Position size and leverage" title="Stress and explanation" />
          <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">Position size guidance: risking 1% of capital with the current stop width implies approximately {formatNumber((simulation.capital * 0.01) / Math.max(outputs.riskAmount / simulation.positionSize, 0.0001), 0)} units.</div>
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">Leverage classification: {simulation.leverage >= 20 ? 'dangerous' : simulation.leverage >= 10 ? 'aggressive' : simulation.leverage >= 5 ? 'elevated' : 'low'}.</div>
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4">Pip value estimate: {formatCurrency(outputs.pipValue)} per pip based on pair convention and size.</div>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Monte Carlo demo" title="Equity path distribution" detail="Illustrative only. Uses win rate, average R, and streak intensity assumptions to generate deterministic demo paths." />
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Best case" tone="up" value={formatCurrency(monteCarlo.best)} />
            <Stat label="Median" value={formatCurrency(monteCarlo.median)} />
            <Stat label="Worst case" tone="down" value={formatCurrency(monteCarlo.worst)} />
            <Stat label="Above start" value={formatPercent(monteCarlo.aboveStartProbability * 100)} />
            <Stat label="Drawdown breach" value={formatPercent(monteCarlo.breachProbability * 100)} help="Probability of falling below 85% of starting capital." />
            <Stat label="Scenario count" value={monteCarlo.paths.length} />
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle eyebrow="Saved scenarios" title="Reusable simulation history" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.savedSimulations.map((saved) => (
            <button className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4 text-left" key={saved.id} onClick={() => setDraft(saved)} type="button">
              <div className="flex items-center justify-between">
                <div className="font-medium">{saved.pairId.toUpperCase()}</div>
                <div className="text-xs text-[var(--muted)]">{saved.scenarioType}</div>
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">Net {formatCurrency(saved.outputs.netPnL)}</div>
            </button>
          ))}
        </div>
      </Panel>
    </Page>
  )
}
