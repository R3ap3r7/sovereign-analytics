import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Area, CartesianGrid, XAxis, YAxis, Tooltip, Line, ComposedChart, ResponsiveContainer } from 'recharts'
import { PriceChart, MLPathsChart } from '../../components/charts/analytics'
import { LoadingPanel } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { calculateTradeOutputs, generateMonteCarloSummary } from '../../domain/calculators'
import { appApi, getSeed } from '../../domain/services/api'
import type { Simulation, MLSimulateResponse } from '../../domain/types'
import { formatCurrency, formatNumber, formatPercent, title } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import clsx from 'clsx'

type EvalFrame = '1D' | '1W' | '1M' | '3M'
type VolRegime = 'calm' | 'base' | 'elevated' | 'shock'

const labelClass = 'text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]'
const inputClass = 'w-full border-none bg-transparent p-0 text-sm font-semibold text-[var(--text)] outline-none focus:ring-0'
const toneButtonClass = (active: boolean) =>
  active
    ? 'px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] bg-[color:var(--panel-3)]'
    : 'px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

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
  const [volatility, setVolatility] = useState<VolRegime>('base')
  const [monteTrades, setMonteTrades] = useState(28)
  const [monteWinRate, setMonteWinRate] = useState(52)
  const [monteAverageR, setMonteAverageR] = useState(1.8)
  const [monteRisk, setMonteRisk] = useState(1.2)
  const [monteStreak] = useState(2)

  const [mlHealth, setMlHealth] = React.useState<boolean | null>(null);
  const [mlResult, setMlResult] = React.useState<MLSimulateResponse | null>(null);
  const [mlLoading, setMlLoading] = React.useState(false);
  const [mlError, setMlError] = React.useState<string | null>(null);

  React.useEffect(() => {
    appApi.checkMLHealth().then(setMlHealth);
  }, []);

  const [tapeData, setTapeData] = React.useState<{ date: string; price: number; ma20: number; ma50: number; upper: number; lower: number }[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = React.useState('1M');
  const windowSizeMap: Record<string, number> = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '4H': 1 };
  const visibleTapeData = tapeData.slice(-(windowSizeMap[selectedTimeframe] ?? 30));

  React.useEffect(() => {
    // Generate 90 days of mock EURUSD data seeded from current close
    const basePrice = 1.0850;
    const points = Array.from({ length: 90 }, (_, i) => {
      const noise = (Math.random() - 0.49) * 0.003;
      const price = parseFloat((basePrice + Math.sin(i / 8) * 0.015 + noise + i * 0.00015).toFixed(5));
      return price;
    });
    const data = points.map((price, i) => {
      const slice = points.slice(Math.max(0, i - 19), i + 1);
      const ma20 = parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(5));
      const sliceLong = points.slice(Math.max(0, i - 49), i + 1);
      const ma50 = parseFloat((sliceLong.reduce((a, b) => a + b, 0) / sliceLong.length).toFixed(5));
      const std = 0.008;
      const date = new Date(Date.now() - (89 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, price, ma20, ma50, upper: parseFloat((ma20 + 2 * std).toFixed(5)), lower: parseFloat((ma20 - 2 * std).toFixed(5)) };
    });
    setTapeData(data);
  }, []);

  const simulation = draft ?? data?.initial ?? null
  const seed = data?.seed ?? null
  const pair = seed && simulation ? seed.pairs.find((item) => item.id === simulation.pairId)! : null
  const forecast = seed && simulation ? seed.forecasts.find((item) => item.pairId === simulation.pairId)! : null
  const marketSeries =
    seed && simulation
      ? seed.priceSeries.find((item) => item.pairId === simulation.pairId && item.timeframe === evalFrame) ??
      seed.priceSeries.find((item) => item.pairId === simulation.pairId && item.timeframe === '1M')
      : null

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

  const monteCarlo = useMemo(
    () =>
      generateMonteCarloSummary({
        capital: simulation?.capital ?? 25000,
        trades: monteTrades,
        winRate: monteWinRate / 100,
        averageR: monteAverageR,
        riskPerTrade: monteRisk,
        streakIntensity: monteStreak,
      }),
    [simulation?.capital, monteTrades, monteWinRate, monteAverageR, monteRisk, monteStreak],
  )

  if (loading || !simulation || !pair || !forecast || !outputs) return <LoadingPanel label="Loading simulation lab…" />

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
    })
  }

  const runMLSimulation = async () => {
    if (!mlHealth) {
      setMlError('ML server is offline. Ask Adi to start the FastAPI server.');
      return;
    }
    setMlLoading(true);
    setMlError(null);
    try {
      const result = await appApi.simulateRisk({
        account_balance: simulation?.capital ?? 10000,
        lot_size: simulation?.lotSize ?? 1.0,
        leverage: simulation?.leverage ?? 100,
        pair_id: (simulation?.pairId ?? 'EURUSD').replace('/', '').replace('-', '').toUpperCase(),
      });
      setMlResult(result);
    } catch (e: any) {
      setMlError(e.message ?? 'Unknown error from ML backend');
    } finally {
      setMlLoading(false);
    }
  };


  const sequenceResult = sequence.reduce((capital, r) => capital + capital * 0.01 * r, simulation.capital)
  const positionGuide = (simulation.capital * (monteRisk / 100)) / Math.max(outputs.riskAmount / Math.max(simulation.positionSize, 1), 0.0001)

  return (
    <div className="grid min-h-[calc(100vh-4rem)] gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-6">
        <section className="border-l-2 border-[var(--warning)] bg-[rgba(224,180,108,0.08)] px-4 py-3 text-sm text-[var(--text)]">
          Scenario engine is currently running in manual mode. Live market prices are connected, but there is no historical strategy evaluator or precomputed simulation dataset behind this workspace yet.
        </section>

        <section className="space-y-4 bg-[color:var(--panel)] p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.08em] text-[var(--text)]">{pair.symbol}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="bg-[rgba(105,211,192,0.1)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">{title(simulation.direction)}</span>
                <span className="bg-[color:var(--panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--muted)]">{simulation.accountCurrency} account</span>
                <span className="bg-[color:var(--panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--muted)]">{simulation.holdingDuration} hold</span>
              </div>
            </div>
            <div className="grid gap-4 text-right sm:grid-cols-2">
              <div>
                <div className={labelClass}>Margin used</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-[var(--text)]">{formatCurrency(outputs.marginUsed)}</div>
              </div>
              <div>
                <div className={labelClass}>R multiple</div>
                <div className="mt-1 text-xl font-bold tabular-nums text-[var(--accent)]">{formatNumber(outputs.rMultiple, 2)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['Holding', simulation.holdingDuration],
              ['Timeframe', evalFrame],
              ['Vol regime', title(volatility)],
              ['Conviction', `${simulation.conviction}%`],
            ].map(([label, value], index) => (
              <div className="border-l-2 border-[color:rgba(141,164,179,0.16)] bg-[color:var(--panel-2)] px-4 py-3" key={label} style={index === 0 ? { borderLeftColor: 'var(--accent)' } : undefined}>
                <div className={labelClass}>{label}</div>
                <div className="mt-2 text-sm font-semibold text-[var(--text)]">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 bg-[color:var(--panel)] p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Market tape</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-[color:var(--panel-2)] p-1">
                {(['4H', '1D', '1W', '1M', '3M'] as const).map((value) => (
                  <button className={toneButtonClass(selectedTimeframe === value)} key={value} onClick={() => { setSelectedTimeframe(value); if (value !== '4H') setEvalFrame(value as EvalFrame); }} type="button">
                    {value}
                  </button>
                ))}
              </div>
              <select
                className="border-none bg-[color:var(--panel-2)] px-3 py-2 text-[11px] font-medium text-[var(--text)] outline-none"
                onChange={(event) => update('holdingDuration', event.target.value)}
                value={simulation.holdingDuration}
              >
                {['4H', '1D', '3D', '1W', '2W', '1M', '3M'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[color:var(--panel-2)] p-4">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={visibleTapeData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={14}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(4)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ background: '#0f1117', border: '1px solid #1f2937', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(val: number, name: string) => [val.toFixed(5), name]}
                />
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#bandFill)" />
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="white" fillOpacity={0} />
                <Line type="monotone" dataKey="upper" stroke="#4f46e5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Upper band" />
                <Line type="monotone" dataKey="lower" stroke="#4f46e5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Lower band" />
                <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="MA20" />
                <Line type="monotone" dataKey="ma50" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MA50" />
                <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} name="Price" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            {[
              ['Gross P/L', formatCurrency(outputs.grossPnL), 'text-[var(--success)]'],
              ['Net P/L', formatCurrency(outputs.netPnL), outputs.netPnL >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'],
              ['Pip move', formatNumber(outputs.pipMove, 1), 'text-[var(--text)]'],
              ['Break-even', formatCurrency(simulation.fees + simulation.spread * outputs.pipValue), 'text-[var(--warning)]'],
            ].map(([label, value, tone]) => (
              <div className="bg-[color:var(--panel-2)] p-3" key={label}>
                <div className={labelClass}>{label}</div>
                <div className={`mt-2 text-lg font-bold tabular-nums ${tone}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* ML Risk Engine Panel */}
          <div className="mt-6 rounded-xl border border-neutral-700 bg-neutral-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
                AI Risk Engine
              </h3>
              <span className={clsx(
                'text-xs px-2 py-1 rounded-full font-medium',
                mlHealth === null && 'bg-neutral-700 text-neutral-400',
                mlHealth === true && 'bg-emerald-900 text-emerald-400',
                mlHealth === false && 'bg-red-900 text-red-400',
              )}>
                {mlHealth === null ? 'Checking...' : mlHealth ? 'ML Server Online' : 'ML Server Offline'}
              </span>
            </div>

            <button
              onClick={runMLSimulation}
              disabled={mlLoading || mlHealth === false}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[color:var(--bg)] text-sm font-semibold transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mlLoading ? 'Running LSTM + Monte Carlo...' : 'Run AI Risk Simulation'}
            </button>

            {mlError && (
              <p className="mt-3 text-xs text-red-400">{mlError}</p>
            )}

            {mlResult && (
              <div className="mt-4 space-y-3">
                <div className={clsx(
                  'text-center py-3 rounded-lg font-bold text-lg',
                  mlResult.risk_status === 'LOW' && 'bg-emerald-900/50 text-emerald-400',
                  mlResult.risk_status === 'MEDIUM' && 'bg-amber-900/50 text-amber-400',
                  mlResult.risk_status === 'HIGH' && 'bg-red-900/50 text-red-400',
                )}>
                  {mlResult.risk_status} RISK — {(mlResult.margin_call_probability * 100).toFixed(1)}% Margin Call Probability
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Predicted Move', `${mlResult.predicted_pip_move > 0 ? '+' : ''}${mlResult.predicted_pip_move} pips`],
                    ['Margin Required', `$${mlResult.margin_required.toFixed(2)}`],
                    ['MC Threshold', `${mlResult.margin_call_threshold_pips.toFixed(1)} pips`],
                    ['Current Close', mlResult.current_close.toFixed(5)],
                    ['Paths Simulated', mlResult.n_paths_simulated.toLocaleString()],
                    ['Volatility (σ)', `${mlResult.sigma_used.toFixed(2)} pips`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-neutral-800 rounded-lg p-2">
                      <div className="text-neutral-500">{label}</div>
                      <div className="text-white font-medium mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
                <MLPathsChart paths={mlResult.sampled_paths} threshold={mlResult.margin_call_threshold_pips} />
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-[color:var(--panel)] p-6">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Trade configuration</h3>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Pair</div>
                <select className={inputClass} onChange={(event) => swapPair(event.target.value)} value={simulation.pairId}>
                  {seed!.pairs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.symbol}
                    </option>
                  ))}
                </select>
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Direction</div>
                <select className={inputClass} onChange={(event) => update('direction', event.target.value as Simulation['direction'])} value={simulation.direction}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Capital</div>
                <input className={inputClass} onChange={(event) => update('capital', Number(event.target.value))} type="number" value={simulation.capital} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Leverage</div>
                <input className={inputClass} onChange={(event) => update('leverage', Number(event.target.value))} type="number" value={simulation.leverage} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Entry</div>
                <input className={inputClass} onChange={(event) => update('entry', Number(event.target.value))} type="number" value={simulation.entry} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Exit</div>
                <input className={inputClass} onChange={(event) => update('exit', Number(event.target.value))} type="number" value={simulation.exit} />
              </label>
            </div>
          </div>

          <div className="bg-[color:var(--panel)] p-6">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Execution metrics</h3>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Stop loss</div>
                <input className={`${inputClass} text-[var(--danger)]`} onChange={(event) => update('stopLoss', Number(event.target.value))} type="number" value={simulation.stopLoss} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Take profit</div>
                <input className={`${inputClass} text-[var(--accent)]`} onChange={(event) => update('takeProfit', Number(event.target.value))} type="number" value={simulation.takeProfit} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Position size</div>
                <input className={inputClass} onChange={(event) => update('positionSize', Number(event.target.value))} type="number" value={simulation.positionSize} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Lot size</div>
                <input className={inputClass} onChange={(event) => update('lotSize', Number(event.target.value))} type="number" value={simulation.lotSize} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Spread</div>
                <input className={inputClass} onChange={(event) => update('spread', Number(event.target.value))} type="number" value={simulation.spread} />
              </label>
              <label className="border-b border-[color:rgba(141,164,179,0.2)] pb-2">
                <div className={labelClass}>Fees</div>
                <input className={inputClass} onChange={(event) => update('fees', Number(event.target.value))} type="number" value={simulation.fees} />
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="bg-[color:var(--panel)] p-6">
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Risk architecture</h3>
              <div className="grid gap-2 md:grid-cols-3">
                {[
                  ['Risk', formatCurrency(outputs.riskAmount), 'text-[var(--danger)]'],
                  ['Reward', formatCurrency(outputs.rewardAmount), 'text-[var(--success)]'],
                  ['Pip value', formatCurrency(outputs.pipValue), 'text-[var(--text)]'],
                  ['Suggested size', formatNumber(positionGuide, 0), 'text-[var(--text)]'],
                  ['Free margin', formatCurrency(outputs.freeMargin), 'text-[var(--warning)]'],
                  ['Ending balance', formatCurrency(outputs.balanceAfterTrade), 'text-[var(--text)]'],
                ].map(([label, value, tone]) => (
                  <div className="border-l-2 border-[color:rgba(141,164,179,0.14)] bg-[color:var(--panel-2)] p-3" key={label}>
                    <div className={labelClass}>{label}</div>
                    <div className={`mt-2 text-sm font-bold tabular-nums ${tone}`}>{value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-[color:var(--panel)] p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {pair.simulationPresets.map((preset) => (
                  <button
                    className="bg-[color:var(--panel-2)] px-3 py-2 text-[11px] font-semibold text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
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
                      })
                    }}
                    type="button"
                  >
                    {title(preset.name)}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <button
                  className="w-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--bg)]"
                  onClick={async () => {
                    const next = { ...simulation, outputs, updatedAt: new Date().toISOString() }
                    await appApi.saveSimulation(next)
                    setActiveSimulation(next)
                  }}
                  type="button"
                >
                  Save simulation
                </button>
                <button className="w-full bg-[color:var(--panel-2)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[color:var(--panel-3)]" onClick={() => setDraft(null)} type="button">
                  Reset parameters
                </button>
              </div>
            </section>

            <section className="bg-[color:var(--panel)] p-5">
              <h4 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Monte Carlo</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Trades', monteTrades, (value: number) => setMonteTrades(value), 10, 80, 1],
                  ['Win rate', monteWinRate, (value: number) => setMonteWinRate(value), 25, 85, 1],
                  ['Avg R', monteAverageR, (value: number) => setMonteAverageR(value), 0.5, 4, 0.1],
                  ['Risk/trade', monteRisk, (value: number) => setMonteRisk(value), 0.25, 4, 0.05],
                ].map(([label, value, setter, min, max, step]) => (
                  <label className="bg-[color:var(--panel-2)] p-3" key={label as string}>
                    <div className={labelClass}>{label as string}</div>
                    <input className={inputClass} onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))} step={step as number} type="number" value={value as number} min={min as number} max={max as number} />
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Best case</div>
                  <div className="mt-2 text-sm font-bold text-[var(--success)]">{formatCurrency(monteCarlo.best)}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Prob &gt; start</div>
                  <div className="mt-2 text-sm font-bold text-[var(--accent)]">{formatPercent(monteCarlo.aboveStartProbability * 100)}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Median</div>
                  <div className="mt-2 text-sm font-bold text-[var(--text)]">{formatCurrency(monteCarlo.median)}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Worst case</div>
                  <div className="mt-2 text-sm font-bold text-[var(--danger)]">{formatCurrency(monteCarlo.worst)}</div>
                </div>
              </div>
            </section>

            <section className="bg-[color:var(--panel)] p-5">
              <h4 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Sequence array</h4>
              <input
                className="w-full border border-[color:rgba(141,164,179,0.16)] bg-[color:var(--panel-2)] p-2 text-[11px] text-[var(--text)] outline-none"
                onChange={(event) =>
                  setSequence(
                    event.target.value
                      .split(',')
                      .map((item) => Number(item.trim()))
                      .filter((item) => Number.isFinite(item)),
                  )
                }
                type="text"
                value={sequence.join(', ')}
              />
              <div className="mt-3 flex items-center justify-between bg-[color:var(--panel-2)] px-3 py-2">
                <span className={labelClass}>Ending capital</span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">{formatCurrency(sequenceResult)}</span>
              </div>
            </section>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bg-[color:var(--panel)] p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Trade conditions</h4>
              <span className="text-[11px] font-semibold text-[var(--text)]">{simulation.holdingDuration}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['calm', 'base', 'elevated', 'shock'] as const).map((value) => (
                <button className={toneButtonClass(volatility === value)} key={value} onClick={() => setVolatility(value)} type="button">
                  {title(value)}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={labelClass}>Conviction</span>
                  <span className="text-sm font-semibold text-[var(--text)]">{simulation.conviction}%</span>
                </div>
                <input className="h-1 w-full appearance-none bg-[color:var(--panel-2)] accent-[var(--accent)]" max={100} min={0} onChange={(event) => update('conviction', Number(event.target.value))} step={1} type="range" value={simulation.conviction} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={labelClass}>Risk per trade</span>
                  <span className="text-sm font-semibold text-[var(--text)]">{formatNumber(monteRisk, 1)}%</span>
                </div>
                <input className="h-1 w-full appearance-none bg-[color:var(--panel-2)] accent-[var(--accent)]" max={4} min={0.25} onChange={(event) => setMonteRisk(Number(event.target.value))} step={0.05} type="range" value={monteRisk} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Timeframe</div>
                  <div className="mt-2 text-sm font-bold text-[var(--text)]">{evalFrame}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] px-3 py-3">
                  <div className={labelClass}>Regime</div>
                  <div className="mt-2 text-sm font-bold text-[var(--text)]">{title(volatility)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--panel)] p-5">
          <h4 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Saved runs</h4>
          {data!.savedSimulations.length ? (
            <div className="space-y-2">
              {data!.savedSimulations.map((saved) => (
                <div className="bg-[color:var(--panel-2)] p-3 transition hover:bg-[color:var(--panel-3)]" key={saved.id}>
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => setDraft(saved)} type="button">
                      <div className="text-sm font-semibold text-[var(--text)]">{saved.pairId.toUpperCase()}</div>
                      <div className={saved.outputs.netPnL >= 0 ? 'mt-1 text-[11px] text-[var(--accent)]' : 'mt-1 text-[11px] text-[var(--danger)]'}>
                        {saved.outputs.netPnL >= 0 ? '+' : ''}
                        {formatCurrency(saved.outputs.netPnL)}
                      </div>
                    </button>
                    <button className="text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]" onClick={() => void appApi.duplicateSimulation(saved.id).then(setDraft)} type="button">
                      Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--muted)]">
              No saved runs yet. Save a manual scenario to keep it in the local workspace.
            </div>
          )}
        </section>

        <section className="bg-[color:var(--panel)] p-5">
          <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Monte summary</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="bg-[color:var(--panel-2)] px-3 py-3">
              <div className={labelClass}>Best</div>
              <div className="mt-2 text-sm font-bold text-[var(--success)]">{formatCurrency(monteCarlo.best)}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-3 py-3">
              <div className={labelClass}>Worst</div>
              <div className="mt-2 text-sm font-bold text-[var(--danger)]">{formatCurrency(monteCarlo.worst)}</div>
            </div>
          </div>
          <button
            className="mt-4 w-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--bg)]"
            onClick={() => void appApi.openPaperTrade({ ...simulation, outputs }).then(() => setActiveSimulation({ ...simulation, outputs }))}
            type="button"
          >
            Open paper trade
          </button>
        </section>

        <section className="bg-[color:var(--panel)] p-5">
          <button
            className="w-full bg-[color:var(--panel-2)] px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
            onClick={() => setDraft(null)}
            type="button"
          >
            Reset parameters
          </button>
        </section>
      </aside>
    </div>
  )
}
