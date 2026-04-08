import { useMemo, useState } from 'react'
import { ForecastChart, buildFallbackDailyPath } from '../../components/charts/analytics'
import { LoadingPanel } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/api'
import { formatNumber, formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const horizonChipClass = (active: boolean) =>
  active
    ? 'px-4 py-1.5 text-xs font-bold text-[var(--accent)] bg-[color:var(--panel-3)]'
    : 'px-4 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

const chartWindows = [
  { label: '1D', days: 1 },
  { label: '3D', days: 3 },
  { label: '1W', days: 5 },
  { label: '2W', days: 10 },
  { label: '1M', days: 21 },
  { label: '2M', days: 42 },
  { label: '3M', days: 63 },
] as const

export const ForecastPage = () => {
  const { data, loading } = useAsyncResource(async () => {
    const forecasts = await appApi.listForecasts()
    const seed = getSeed()
    return forecasts.map((forecast) => ({
      forecast,
      pair: seed.pairs.find((item) => item.id === forecast.pairId)!,
    }))
  }, [])

  const [selectedPairId, setSelectedPairId] = useState('eur-usd')
  const [windowDays, setWindowDays] = useState(21)
  const [bandScale, setBandScale] = useState(1)
  const [displayMode, setDisplayMode] = useState<'price' | 'move'>('price')
  const [showRange, setShowRange] = useState(false)

  const selected = useMemo(
    () => data?.find((item) => item.pair.id === selectedPairId) ?? data?.[0] ?? null,
    [data, selectedPairId],
  )

  if (loading || !data || !selected) return <LoadingPanel label="Loading forecast studio…" />

  const ranked = [...data].sort((a, b) => b.forecast.confidence - a.forecast.confidence)
  const basePath = selected.forecast.basePath
  const spotPrice = selected.forecast.spotPrice ?? selected.forecast.dailyPath?.[0]?.value ?? basePath[0]?.value ?? 0
  const activeDailyPath = selected.forecast.dailyPath?.length
    ? selected.forecast.dailyPath
    : buildFallbackDailyPath(selected.forecast)
  const selectedWindowPoint = activeDailyPath[Math.min(windowDays, activeDailyPath.length) - 1]
  const projectedValue = selectedWindowPoint?.value ?? spotPrice
  const projectedMovePct = spotPrice ? ((projectedValue - spotPrice) / spotPrice) * 100 : 0
  const projectedMoveBps = spotPrice ? ((projectedValue - spotPrice) / spotPrice) * 10000 : 0
  const driverEntries = Object.entries(selected.forecast.driverImportance).sort(([, a], [, b]) => b - a)
  const maxDriverValue = Math.max(...driverEntries.map(([, value]) => value), 1)
  const modelMeta = selected.forecast.model
  const pointMethod = modelMeta?.horizons.find((horizon) => horizon.horizon === '1D')?.aggregation ?? 'mean'
  const dailyPreview = activeDailyPath
    .slice(0, Math.min(windowDays, 12))
    .map((point) => {
      const movePct = spotPrice ? ((point.value - spotPrice) / spotPrice) * 100 : 0
      return {
        ...point,
        movePct,
        moveBps: spotPrice ? ((point.value - spotPrice) / spotPrice) * 10000 : 0,
        upper: point.value * Math.exp(point.uncertainty * bandScale),
        lower: point.value * Math.exp(-point.uncertainty * bandScale),
      }
    })
  const direction = projectedValue >= spotPrice ? 'Bullish' : 'Bearish'
  const diagnosticRows = [
    {
      label: 'Point method',
      value: pointMethod === 'median' ? 'Robust median' : 'Weighted mean',
      width: pointMethod === 'median' ? 78 : 58,
      tone: 'accent',
    },
    {
      label: 'Projected move',
      value: `${projectedMovePct >= 0 ? '+' : ''}${formatNumber(projectedMovePct, 2)}%`,
      width: Math.min(100, Math.max(24, Math.abs(projectedMovePct) * 14)),
      tone: projectedMovePct < 0 ? 'danger' : 'default',
    },
    {
      label: 'Forecast window',
      value: `${windowDays} days`,
      width: Math.min(100, Math.max(28, (windowDays / 63) * 100)),
      tone: 'warning',
    },
  ] as const

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <section className="border-l-2 border-[var(--warning)] bg-[rgba(224,180,108,0.08)] px-4 py-3 text-sm text-[var(--text)]">
        Daily projections are generated from the pair-specific 1-day model and rolled forward business day by business day. Longer horizons summarize that path at 1W, 1M, and 3M.
      </section>

      <header className="flex flex-col gap-5 border-b border-[color:rgba(141,164,179,0.14)] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.08em] text-[var(--text)]">{selected.pair.symbol}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Spot</span>
              <span className="text-xl font-bold tabular-nums text-[var(--accent)]">{formatNumber(spotPrice, selected.pair.displayPrecision)}</span>
            </div>
          </div>

          <div className="hidden h-12 w-px bg-[color:rgba(141,164,179,0.18)] xl:block" />

          <div className="space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Bias</span>
            <div className="flex items-center gap-2">
              <span className={direction === 'Bullish' ? 'text-lg font-bold text-[var(--success)]' : 'text-lg font-bold text-[var(--danger)]'}>
                {direction}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Confidence</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tabular-nums text-[var(--text)]">{formatPercent(selected.forecast.confidence, 0)}</span>
              <div className="h-1.5 w-16 overflow-hidden bg-[color:var(--panel-2)]">
                <div className="h-full bg-[var(--success)]" style={{ width: `${selected.forecast.confidence * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <select
            className="border-none bg-[color:var(--panel-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] outline-none"
            onChange={(event) => {
              setSelectedPairId(event.target.value)
            }}
            value={selected.pair.id}
          >
            {ranked.map(({ pair }) => (
              <option key={pair.id} value={pair.id}>
                {pair.symbol}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 bg-[color:var(--panel)] p-1">
            {chartWindows.map((option) => (
              <button
                aria-pressed={option.days === windowDays}
                className={horizonChipClass(option.days === windowDays)}
                key={option.label}
                onClick={() => setWindowDays(option.days)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="bg-[color:var(--panel)] p-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Daily forecast path</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {windowDays}-day point forecast path. The confidence range is optional and hidden by default so the chart stays focused on the most likely daily close path.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border-none bg-[color:var(--panel-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] outline-none"
                onChange={(event) => setDisplayMode(event.target.value as 'price' | 'move')}
                value={displayMode}
              >
                <option value="price">Price</option>
                <option value="move">Move (bps)</option>
              </select>
              <label className="flex items-center gap-3 bg-[color:var(--panel-2)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                <input
                  checked={showRange}
                  className="accent-[var(--accent)]"
                  onChange={(event) => setShowRange(event.target.checked)}
                  type="checkbox"
                />
                <span>Show range</span>
              </label>
              {showRange ? (
                <label className="flex items-center gap-3 bg-[color:var(--panel-2)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  <span>Range</span>
                  <input
                    className="accent-[var(--accent)]"
                    max="1.4"
                    min="0.7"
                    onChange={(event) => setBandScale(Number(event.target.value))}
                    step="0.1"
                    type="range"
                    value={bandScale}
                  />
                  <span className="min-w-[3rem] text-right font-bold text-[var(--text)]">{bandScale.toFixed(1)}x</span>
                </label>
              ) : null}
            </div>
          </div>
          <div className="min-h-[420px] bg-[linear-gradient(90deg,rgba(123,208,255,0.08)_0%,rgba(105,211,192,0.03)_100%)] p-4">
            <ForecastChart
              bandScale={bandScale}
              displayMode={displayMode}
              displayPrecision={selected.pair.displayPrecision}
              forecast={selected.forecast}
              showRange={showRange}
              windowDays={windowDays}
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-[color:rgba(141,164,179,0.14)] pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            <span>Current spot {formatNumber(spotPrice, selected.pair.displayPrecision)}</span>
            <span className="text-[var(--accent)]">
              {windowDays}-day target {displayMode === 'price' ? formatNumber(projectedValue, selected.pair.displayPrecision) : `${projectedMovePct >= 0 ? '+' : ''}${formatNumber((projectedValue - spotPrice) / Math.max(spotPrice, 1e-8) * 10000, 0)} bps`}
            </span>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="bg-[color:var(--panel)] p-5">
            <h2 className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Diagnostics</h2>
            <div className="space-y-5">
              {diagnosticRows.map((row) => (
                <div className="space-y-1" key={row.label}>
                  <div className="flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                    <span>{row.label}</span>
                    <span className={row.tone === 'accent' ? 'text-[var(--text)]' : row.tone === 'danger' ? 'text-[var(--danger)]' : row.tone === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--text)]'}>
                      {row.value}
                    </span>
                  </div>
                  <div className="h-1 bg-[color:var(--panel-2)]">
                    <div
                      className={row.tone === 'danger' ? 'h-full bg-[var(--danger)]' : row.tone === 'warning' ? 'h-full bg-[var(--warning)]' : 'h-full bg-[var(--accent)]'}
                      style={{ width: `${row.width}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-1 pt-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Macro rate diff</div>
                <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-3 py-2">
                  <span className="text-xs font-black tabular-nums text-[var(--text)]">{formatNumber((selected.forecast.confidence * 250) + 110, 0)} bps</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{selected.pair.baseCode} vs {selected.pair.quoteCode}</span>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Window target</div>
                  <div className="bg-[color:var(--panel-2)] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-[var(--text)]">{windowDays}D</span>
                      <span className="text-sm font-bold tabular-nums text-[var(--accent)]">{formatNumber(projectedValue, selected.pair.displayPrecision)}</span>
                    </div>
                  </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Projected change</div>
                <div className="bg-[color:var(--panel-2)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-[var(--text)]">{projectedMovePct >= 0 ? 'Upside' : 'Downside'}</span>
                    <span className={projectedMovePct >= 0 ? 'text-sm font-bold tabular-nums text-[var(--success)]' : 'text-sm font-bold tabular-nums text-[var(--danger)]'}>
                      {projectedMoveBps >= 0 ? '+' : ''}{formatNumber(projectedMoveBps, 0)} bps
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[color:rgba(141,164,179,0.14)] pt-4">
                <p className="text-[10px] leading-5 text-[var(--muted)] opacity-80">{selected.forecast.disclaimer}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="bg-[color:var(--panel)] p-6">
          <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Driver importance ranking</h3>
          <div className="space-y-4">
            {driverEntries.map(([key, value], index) => (
                <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.5rem] items-center gap-4" key={key}>
                  <span className="text-[11px] font-medium capitalize text-[var(--muted)]">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="h-4 overflow-hidden bg-[color:var(--panel-2)]">
                    <div
                      className="h-full bg-[var(--accent)]"
                      style={{
                        opacity: Math.max(0.24, 1 - index * 0.14),
                        width: `${Math.max(12, (value / maxDriverValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-[var(--text)]">{formatNumber(value, 2)}</span>
                </div>
              ))}
          </div>
        </section>

        <section className="bg-[color:var(--panel)] p-6">
          <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Confidence band matrix</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[color:rgba(141,164,179,0.16)] text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                <th className="pb-3">Horizon</th>
                <th className="pb-3">Lower</th>
                <th className="pb-3">Central</th>
                <th className="pb-3">Upper</th>
              </tr>
            </thead>
            <tbody className="text-xs tabular-nums">
              {selected.forecast.basePath.map((point, index) => (
                <tr className="border-b border-[color:rgba(141,164,179,0.08)]" key={point.horizon}>
                  <td className="py-3 font-bold text-[var(--text)]">{point.horizon}</td>
                  <td className="py-3 text-[var(--muted)]">{formatNumber(selected.forecast.pessimisticPath[index]?.value ?? point.value, 4)}</td>
                  <td className="py-3 font-medium text-[var(--text)]">{formatNumber(point.value, 4)}</td>
                  <td className="py-3 text-[var(--success)]">{formatNumber(selected.forecast.optimisticPath[index]?.value ?? point.value, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="bg-[color:var(--panel)] p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Day-by-day projection</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">First {dailyPreview.length} business days from the active forecast window.</p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Window {windowDays} days
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[color:rgba(141,164,179,0.16)] text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                <th className="pb-3">Day</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Projected close</th>
                <th className="pb-3">Move</th>
                {showRange ? <th className="pb-3">Lower band</th> : null}
                {showRange ? <th className="pb-3">Upper band</th> : null}
              </tr>
            </thead>
            <tbody className="text-xs">
              {dailyPreview.map((point) => (
                <tr className="border-b border-[color:rgba(141,164,179,0.08)]" key={point.date}>
                  <td className="py-3 font-bold text-[var(--text)]">D+{point.day}</td>
                  <td className="py-3 text-[var(--muted)]">{point.date}</td>
                  <td className="py-3 font-semibold tabular-nums text-[var(--text)]">{formatNumber(point.value, selected.pair.displayPrecision)}</td>
                  <td className={point.movePct >= 0 ? 'py-3 tabular-nums text-[var(--success)]' : 'py-3 tabular-nums text-[var(--danger)]'}>
                    {point.moveBps >= 0 ? '+' : ''}{formatNumber(point.moveBps, 0)} bps
                  </td>
                  {showRange ? <td className="py-3 tabular-nums text-[var(--muted)]">{formatNumber(point.lower, selected.pair.displayPrecision)}</td> : null}
                  {showRange ? <td className="py-3 tabular-nums text-[var(--accent)]">{formatNumber(point.upper, selected.pair.displayPrecision)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modelMeta ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="bg-[color:var(--panel)] p-6">
            <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Model specification</h3>
            <div className="space-y-5">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Methodology</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text)]">{modelMeta.methodology}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-[color:rgba(141,164,179,0.12)] pt-4 text-sm">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Observations</div>
                  <div className="mt-2 font-semibold tabular-nums text-[var(--text)]">{formatNumber(modelMeta.observations, 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Last observation</div>
                  <div className="mt-2 font-semibold text-[var(--text)]">{modelMeta.lastObservation}</div>
                </div>
              </div>

              <div className="border-t border-[color:rgba(141,164,179,0.12)] pt-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Trained at</div>
                <div className="mt-2 font-semibold text-[var(--text)]">{modelMeta.trainedAt.replace('T', ' ').slice(0, 16)} UTC</div>
              </div>
            </div>
          </div>

          <div className="bg-[color:var(--panel)] p-6">
            <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Holdout evaluation</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[color:rgba(141,164,179,0.16)] text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                    <th className="pb-3">Horizon</th>
                    <th className="pb-3">Family</th>
                    <th className="pb-3">Point</th>
                    <th className="pb-3">Features</th>
                    <th className="pb-3">Dir. acc.</th>
                    <th className="pb-3">RMSE</th>
                    <th className="pb-3">MAE</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {modelMeta.horizons.map((horizon) => (
                    <tr className="border-b border-[color:rgba(141,164,179,0.08)] align-top" key={horizon.horizon}>
                      <td className="py-3 font-bold text-[var(--text)]">{horizon.horizon}</td>
                      <td className="py-3 capitalize text-[var(--accent)]">{horizon.family}</td>
                      <td className="py-3 capitalize text-[var(--text)]">{horizon.aggregation ?? 'mean'}</td>
                      <td className="py-3 text-[var(--muted)]">{horizon.features.join(', ')}</td>
                      <td className="py-3 font-medium tabular-nums text-[var(--text)]">{formatPercent(horizon.test.directionalAccuracy, 1)}</td>
                      <td className="py-3 tabular-nums text-[var(--text)]">{formatNumber(horizon.test.rmseBps, 2)} bps</td>
                      <td className="py-3 tabular-nums text-[var(--text)]">{formatNumber(horizon.test.maeBps, 2)} bps</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden bg-[color:var(--panel)] p-6">
        <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Market alpha outlook</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4">
            {ranked.map(({ forecast, pair }) => {
              const start = forecast.spotPrice ?? forecast.dailyPath?.[0]?.value ?? forecast.basePath[0]?.value ?? 0
              const end = forecast.dailyPath?.[Math.min(windowDays, forecast.dailyPath.length) - 1]?.value
                ?? forecast.basePath.at(-1)?.value
                ?? start
              const projectedDelta = start ? ((end - start) / start) * 100 : 0
              const toneClass =
                projectedDelta > 0.05
                  ? 'border-[var(--success)]'
                  : projectedDelta < -0.05
                    ? 'border-[var(--danger)]'
                    : 'border-[color:rgba(141,164,179,0.2)]'
              return (
                <button
                  className={[
                    'min-w-[156px] flex-shrink-0 border-l-2 bg-[color:var(--panel-2)] p-3 text-left transition',
                    toneClass,
                    pair.id === selected.pair.id ? 'bg-[color:var(--panel-3)] ring-1 ring-[color:rgba(105,211,192,0.3)]' : 'hover:bg-[color:var(--panel-3)]',
                  ].join(' ')}
                  key={forecast.id}
                  onClick={() => {
                    setSelectedPairId(pair.id)
                  }}
                  type="button"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="text-xs font-black text-[var(--text)]">{pair.symbol}</span>
                    <span
                      className={
                        projectedDelta > 0.05
                          ? 'bg-[rgba(105,211,192,0.1)] px-1 py-0.5 text-[9px] font-bold text-[var(--success)]'
                          : projectedDelta < -0.05
                            ? 'bg-[rgba(227,128,120,0.12)] px-1 py-0.5 text-[9px] font-bold text-[var(--danger)]'
                            : 'bg-[color:var(--panel)] px-1 py-0.5 text-[9px] font-bold text-[var(--muted)]'
                      }
                    >
                      {projectedDelta > 0.05 ? `+${formatNumber(projectedDelta, 1)}%` : projectedDelta < -0.05 ? `${formatNumber(projectedDelta, 1)}%` : 'FLAT'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">Proj. {formatNumber(end, 4)}</div>
                  <div className="mt-3 h-1 w-full bg-[color:var(--panel)]">
                    <div
                      className={projectedDelta > 0.05 ? 'h-full bg-[var(--success)]' : projectedDelta < -0.05 ? 'h-full bg-[var(--danger)]' : 'h-full bg-[var(--muted)]'}
                      style={{ width: `${Math.min(100, Math.max(12, forecast.confidence * 100))}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
