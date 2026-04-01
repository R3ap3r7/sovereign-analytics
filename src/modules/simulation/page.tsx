import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { calculateTradeOutputs, generateMonteCarloSummary } from '../../domain/calculators'
import { appApi, getSeed } from '../../domain/services/mockApi'
import type { Simulation } from '../../domain/types'
import { formatCurrency, formatNumber, formatPercent, title } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

type EvalFrame = '1D' | '1W' | '1M' | '3M'
type Horizon = '1W' | '1M' | '3M' | '6M'
type VolRegime = 'calm' | 'base' | 'elevated' | 'shock'

const HORIZON_POINTS: Record<Horizon, number> = {
  '1W': 8,
  '1M': 16,
  '3M': 24,
  '6M': 32,
}

const VOL_MULTIPLIER: Record<VolRegime, number> = {
  calm: 0.45,
  base: 0.8,
  elevated: 1.2,
  shock: 1.75,
}

const DenseInput = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <label className="block">
    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
    <div className="mt-2">{children}</div>
  </label>
)

const controlClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const chipClass =
  'border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const buildScenarioPath = ({
  simulation,
  horizon,
  scenarioLength,
  conviction,
  volatility,
}: {
  simulation: Simulation
  horizon: Horizon
  scenarioLength: number
  conviction: number
  volatility: VolRegime
}) => {
  const count = HORIZON_POINTS[horizon]
  const targetBias = simulation.direction === 'long' ? simulation.takeProfit - simulation.entry : simulation.entry - simulation.takeProfit
  const stopBias = simulation.direction === 'long' ? simulation.entry - simulation.stopLoss : simulation.stopLoss - simulation.entry
  const drift = (targetBias / Math.max(count, 1)) * (0.45 + conviction / 160)
  const shock = stopBias * VOL_MULTIPLIER[volatility] * 0.18

  return Array.from({ length: count }, (_, index) => {
    const step = index + 1
    const wave = Math.sin(step / 2.2) * shock
    const baseMove = drift * step + wave * 0.35
    const base =
      simulation.direction === 'long'
        ? simulation.entry + baseMove
        : simulation.entry - baseMove
    const bull =
      simulation.direction === 'long'
        ? base + shock * 0.85
        : base - shock * 0.85
    const bear =
      simulation.direction === 'long'
        ? base - shock * 1.15
        : base + shock * 1.15
    const event =
      step === Math.max(2, Math.round((scenarioLength / 30) * count * 0.55))
        ? simulation.direction === 'long'
          ? base - shock * 1.55
          : base + shock * 1.55
        : null

    return {
      step: `T${step}`,
      base,
      bull,
      bear,
      event,
    }
  })
}

const ScenarioPathChart = ({
  data,
}: {
  data: Array<{ step: string; base: number; bull: number; bear: number; event: number | null }>
}) => {
  const width = 960
  const height = 288
  const paddingX = 28
  const paddingTop = 20
  const paddingBottom = 30
  const values = data.flatMap((point) => [point.base, point.bull, point.bear, point.event ?? point.base])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 0.0001)
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingTop - paddingBottom
  const xFor = (index: number) => paddingX + (plotWidth * index) / Math.max(data.length - 1, 1)
  const yFor = (value: number) => paddingTop + ((max - value) / range) * plotHeight
  const line = (key: 'base' | 'bull' | 'bear') =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}`).join(' ')
  const eventPoints = data.filter((point) => point.event !== null).map((point, index) => ({ x: xFor(index), y: yFor(point.event ?? point.base) }))
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = max - (range / 3) * index
    return { value, y: yFor(value) }
  })

  return (
    <div className="overflow-hidden rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-2)]">
      <svg aria-label="Scenario path chart" className="h-72 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={paddingX} x2={width - paddingX} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
            <text fill="#7f9287" fontFamily="IBM Plex Mono, monospace" fontSize="10" x={6} y={tick.y + 4}>
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}
        {data.map((point, index) => (
          <text
            fill="#7f9287"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="10"
            key={point.step}
            textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            x={xFor(index)}
            y={height - 10}
          >
            {point.step}
          </text>
        ))}
        <path d={line('bull')} fill="none" stroke="#68c79d" strokeWidth="2" />
        <path d={line('bear')} fill="none" stroke="#e38078" strokeWidth="2" />
        <path d={line('base')} fill="none" stroke="#edf4f7" strokeWidth="2.4" />
        {eventPoints.map((point) => (
          <g key={`${point.x}-${point.y}`}>
            <circle cx={point.x} cy={point.y} fill="#e0b46c" r="4" />
            <circle cx={point.x} cy={point.y} fill="none" r="8" stroke="rgba(224,180,108,0.28)" />
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 border-t border-[var(--line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#edf4f7]" />Base</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#68c79d]" />Bull</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e38078]" />Bear</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e0b46c]" />Event shock</span>
      </div>
    </div>
  )
}

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
      seed,
      initial: simulation,
      savedSimulations: seed.simulations.filter((item) => item.userId === user?.id),
    }
  }, [user?.id, pairId, simulationId, activeSimulation?.id])

  const [draft, setDraft] = useState<Simulation | null>(null)
  const [sequence, setSequence] = useState([1, -1, -0.5, 1.8])
  const [evalFrame, setEvalFrame] = useState<EvalFrame>('1M')
  const [pathHorizon, setPathHorizon] = useState<Horizon>('1M')
  const [scenarioLength, setScenarioLength] = useState(21)
  const [volatility, setVolatility] = useState<VolRegime>('base')
  const [monteTrades, setMonteTrades] = useState(28)
  const [monteWinRate, setMonteWinRate] = useState(52)
  const [monteAverageR, setMonteAverageR] = useState(1.8)
  const [monteRisk, setMonteRisk] = useState(1.2)
  const [monteStreak, setMonteStreak] = useState(2)

  const simulation = draft ?? data?.initial ?? null
  const seed = data?.seed ?? null
  const pair = seed && simulation ? seed.pairs.find((item) => item.id === simulation.pairId)! : null
  const forecast = seed && simulation ? seed.forecasts.find((item) => item.pairId === simulation.pairId)! : null

  const outputs = useMemo(() => {
    if (!simulation || !pair) return null
    return calculateTradeOutputs({
      symbol: pair.symbol,
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
  }, [simulation, pair])

  const monteCarlo = useMemo(() => {
    return generateMonteCarloSummary({
      capital: simulation?.capital ?? 25000,
      trades: monteTrades,
      winRate: monteWinRate / 100,
      averageR: monteAverageR,
      riskPerTrade: monteRisk,
      streakIntensity: monteStreak,
    })
  }, [simulation?.capital, monteTrades, monteWinRate, monteAverageR, monteRisk, monteStreak])

  const scenarioPath = useMemo(() => {
    if (!simulation) return []
    return buildScenarioPath({
      simulation,
      horizon: pathHorizon,
      scenarioLength,
      conviction: simulation.conviction,
      volatility,
    })
  }, [simulation, pathHorizon, scenarioLength, volatility])

  if (loading || !simulation || !pair || !forecast || !outputs) {
    return <LoadingPanel label="Loading simulation lab…" />
  }

  const update = <K extends keyof Simulation>(key: K, value: Simulation[K]) => {
    const next = { ...simulation, [key]: value }
    const nextOutputs = calculateTradeOutputs({
      symbol: pair.symbol,
      direction: next.direction,
      capital: next.capital,
      leverage: next.leverage,
      entry: next.entry,
      exit: next.exit,
      stopLoss: next.stopLoss,
      takeProfit: next.takeProfit,
      positionSize: next.positionSize,
      spread: next.spread,
      fees: next.fees,
    })
    setDraft({ ...next, outputs: nextOutputs })
  }

  const swapPair = (nextPairId: string) => {
    const next = appApi.buildSimulationFromPair(nextPairId, simulation.direction)
    setDraft({
      ...next,
      capital: simulation.capital,
      accountCurrency: simulation.accountCurrency,
      leverage: simulation.leverage,
      conviction: simulation.conviction,
      holdingDuration: simulation.holdingDuration,
      scenarioType: simulation.scenarioType,
    })
  }

  const sequenceResult = sequence.reduce((capital, r) => capital + capital * 0.01 * r, simulation.capital)
  const positionGuide = (simulation.capital * (monteRisk / 100)) / Math.max(outputs.riskAmount / Math.max(simulation.positionSize, 1), 0.0001)

  return (
    <Page
      title="Simulation Lab"
      actions={
        <PrimaryButton
          onClick={async () => {
            const next = { ...simulation, outputs, updatedAt: new Date().toISOString() }
            await appApi.saveSimulation(next)
            setActiveSimulation(next)
          }}
          type="button"
        >
          Save
        </PrimaryButton>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.05fr_0.95fr]">
              <div className="bg-[color:var(--panel-2)] px-5 py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Simulation protocol</div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <div className="font-display text-[2rem] font-semibold tracking-[-0.05em]">{pair.symbol} SIM</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {title(simulation.direction)} · {simulation.accountCurrency} · {simulation.scenarioType}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="min-w-[11rem] bg-[color:var(--panel)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Projected liquidity</div>
                    <div className="mt-2 font-display text-[1.45rem] font-semibold text-[var(--text)]">{formatCurrency(outputs.marginUsed)}</div>
                  </div>
                  <div className="min-w-[11rem] bg-[color:var(--panel)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Sentiment delta</div>
                    <div className="mt-2 font-display text-[1.45rem] font-semibold text-[var(--warning)]">{formatNumber(outputs.rMultiple)}</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Holding</div>
                  <div className="mt-2 text-sm text-[var(--text)]">{simulation.holdingDuration}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Evaluation</div>
                  <div className="mt-2 text-sm text-[var(--text)]">{evalFrame}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Path horizon</div>
                  <div className="mt-2 text-sm text-[var(--text)]">{pathHorizon}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Vol regime</div>
                  <div className="mt-2 text-sm text-[var(--text)]">{title(volatility)}</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Projected path" title="Main path" />
            <ScenarioPathChart data={scenarioPath} />
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Stat label="Gross P/L" tone={outputs.grossPnL >= 0 ? 'up' : 'down'} value={formatCurrency(outputs.grossPnL)} />
              <Stat label="Net P/L" tone={outputs.netPnL >= 0 ? 'up' : 'down'} value={formatCurrency(outputs.netPnL)} />
              <Stat label="Pip move" value={formatNumber(outputs.pipMove, 1)} />
              <Stat label="Breakeven" value={formatCurrency(simulation.fees + simulation.spread * outputs.pipValue)} />
            </div>
          </Panel>

          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <SectionTitle eyebrow="Trade setup" title="Inputs" />
                <div className="grid gap-3 md:grid-cols-2">
                  <DenseInput label="Pair">
                    <select className={controlClass} value={simulation.pairId} onChange={(event) => swapPair(event.target.value)}>
                      {seed!.pairs.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.symbol}
                        </option>
                      ))}
                    </select>
                  </DenseInput>
                  <DenseInput label="Direction">
                    <select className={controlClass} value={simulation.direction} onChange={(event) => update('direction', event.target.value as Simulation['direction'])}>
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </DenseInput>
                  <DenseInput label="Capital">
                    <input className={controlClass} type="number" value={simulation.capital} onChange={(event) => update('capital', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Leverage">
                    <input className={controlClass} type="number" value={simulation.leverage} onChange={(event) => update('leverage', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Entry">
                    <input className={controlClass} type="number" value={simulation.entry} onChange={(event) => update('entry', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Exit">
                    <input className={controlClass} type="number" value={simulation.exit} onChange={(event) => update('exit', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Stop">
                    <input className={controlClass} type="number" value={simulation.stopLoss} onChange={(event) => update('stopLoss', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Target">
                    <input className={controlClass} type="number" value={simulation.takeProfit} onChange={(event) => update('takeProfit', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Position size">
                    <input className={controlClass} type="number" value={simulation.positionSize} onChange={(event) => update('positionSize', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Lot size">
                    <input className={controlClass} type="number" value={simulation.lotSize} onChange={(event) => update('lotSize', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Spread">
                    <input className={controlClass} type="number" value={simulation.spread} onChange={(event) => update('spread', Number(event.target.value))} />
                  </DenseInput>
                  <DenseInput label="Fees">
                    <input className={controlClass} type="number" value={simulation.fees} onChange={(event) => update('fees', Number(event.target.value))} />
                  </DenseInput>
                </div>
              </div>

              <div className="bg-[color:var(--panel)] px-4 py-4">
                <SectionTitle eyebrow="Time controls" title="Path and horizon" />
                <div className="grid gap-3 md:grid-cols-2">
                  <DenseInput label="Holding duration">
                    <select className={controlClass} value={simulation.holdingDuration} onChange={(event) => update('holdingDuration', event.target.value)}>
                      {['4H', '1D', '3D', '1W', '2W', '1M', '3M'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </DenseInput>
                  <DenseInput label="Evaluation frame">
                    <select className={controlClass} value={evalFrame} onChange={(event) => setEvalFrame(event.target.value as EvalFrame)}>
                      {(['1D', '1W', '1M', '3M'] as const).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </DenseInput>
                  <DenseInput label="Path horizon">
                    <select className={controlClass} value={pathHorizon} onChange={(event) => setPathHorizon(event.target.value as Horizon)}>
                      {(['1W', '1M', '3M', '6M'] as const).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </DenseInput>
                  <DenseInput label="Scenario length">
                    <div>
                      <input className="w-full accent-[var(--accent)]" max={60} min={5} step={1} type="range" value={scenarioLength} onChange={(event) => setScenarioLength(Number(event.target.value))} />
                      <div className="mt-2 text-sm text-[var(--muted)]">{scenarioLength} days</div>
                    </div>
                  </DenseInput>
                  <DenseInput label="Volatility">
                    <div className="grid grid-cols-4 gap-1">
                      {(['calm', 'base', 'elevated', 'shock'] as const).map((value) => (
                        <button
                          className={[chipClass, volatility === value ? 'border-[var(--accent)] text-[var(--accent)]' : ''].join(' ')}
                          key={value}
                          onClick={() => setVolatility(value)}
                          type="button"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </DenseInput>
                  <DenseInput label="Conviction">
                    <div>
                      <input className="w-full accent-[var(--accent)]" max={100} min={0} step={1} type="range" value={simulation.conviction} onChange={(event) => update('conviction', Number(event.target.value))} />
                      <div className="mt-2 text-sm text-[var(--muted)]">{simulation.conviction}%</div>
                    </div>
                  </DenseInput>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel>
              <SectionTitle eyebrow="Stress" title="Leverage and size" />
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Risk amount" value={formatCurrency(outputs.riskAmount)} />
                <Stat label="Reward amount" value={formatCurrency(outputs.rewardAmount)} />
                <Stat label="Pip value" value={formatCurrency(outputs.pipValue)} />
                <Stat label="Suggested size" value={formatNumber(positionGuide, 0)} />
                <Stat label="Free margin" value={formatCurrency(outputs.freeMargin)} />
                <Stat label="Ending balance" value={formatCurrency(outputs.balanceAfterTrade)} />
              </div>
            </Panel>

            <Panel>
              <SectionTitle eyebrow="Forecast" title="Reference" />
              <ForecastChart forecast={forecast} />
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Presets" title="Terminal controls" />
            <div className="grid gap-2">
              {pair.simulationPresets.map((preset) => (
                <button
                  className={chipClass}
                  key={preset.name}
                  onClick={() => {
                    const next = appApi.buildSimulationFromPair(pair.id, preset.direction)
                    setDraft({
                      ...next,
                      leverage: preset.leverage,
                      entry: next.entry + preset.entryOffset * pair.pipPrecision,
                      stopLoss: next.entry + preset.stopOffset * pair.pipPrecision,
                      takeProfit: next.entry + preset.targetOffset * pair.pipPrecision,
                      holdingDuration: simulation.holdingDuration,
                      conviction: simulation.conviction,
                      scenarioType: preset.name,
                    })
                  }}
                  type="button"
                >
                  {preset.name}
                </button>
              ))}
              <button className={chipClass} type="button">Execute sim</button>
              <button className={chipClass} type="button">Inject volatility</button>
              <button className={chipClass} type="button">Reset</button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Monte Carlo" title="Distribution" />
            <div className="grid gap-3">
              <DenseInput label="Trades">
                <input className={controlClass} type="number" value={monteTrades} onChange={(event) => setMonteTrades(Number(event.target.value))} />
              </DenseInput>
              <DenseInput label="Win rate">
                <input className={controlClass} type="number" value={monteWinRate} onChange={(event) => setMonteWinRate(Number(event.target.value))} />
              </DenseInput>
              <DenseInput label="Average R">
                <input className={controlClass} type="number" step="0.1" value={monteAverageR} onChange={(event) => setMonteAverageR(Number(event.target.value))} />
              </DenseInput>
              <DenseInput label="Risk / trade">
                <input className={controlClass} type="number" step="0.1" value={monteRisk} onChange={(event) => setMonteRisk(Number(event.target.value))} />
              </DenseInput>
              <DenseInput label="Streak">
                <input className={controlClass} type="number" value={monteStreak} onChange={(event) => setMonteStreak(Number(event.target.value))} />
              </DenseInput>
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Best" tone="up" value={formatCurrency(monteCarlo.best)} />
                <Stat label="Median" value={formatCurrency(monteCarlo.median)} />
                <Stat label="Worst" tone="down" value={formatCurrency(monteCarlo.worst)} />
                <Stat label="Above start" value={formatPercent(monteCarlo.aboveStartProbability * 100)} />
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Sequence" title="Compounding" />
            <input
              className={controlClass}
              value={sequence.join(', ')}
              onChange={(event) =>
                setSequence(
                  event.target.value
                    .split(',')
                    .map((item) => Number(item.trim()))
                    .filter((item) => Number.isFinite(item)),
                )
              }
            />
            <div className="mt-4">
              <Stat label="Ending capital" value={formatCurrency(sequenceResult)} />
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Saved" title="Scenarios" />
            <div className="space-y-2">
              {data!.savedSimulations.map((saved) => (
                <div className="bg-[color:var(--panel-2)] px-4 py-3" key={saved.id}>
                  <button className="w-full text-left" onClick={() => setDraft(saved)} type="button">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{saved.pairId.toUpperCase()}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{saved.scenarioType}</div>
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">Net {formatCurrency(saved.outputs.netPnL)}</div>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button className={chipClass} onClick={() => void appApi.duplicateSimulation(saved.id).then(setDraft)} type="button">
                      Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Portfolio" title="Handoff" />
            <PrimaryButton onClick={() => void appApi.openPaperTrade({ ...simulation, outputs }).then(() => setActiveSimulation({ ...simulation, outputs }))} type="button">
              Open paper trade
            </PrimaryButton>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
