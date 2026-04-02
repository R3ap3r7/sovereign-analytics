import { useMemo, useState } from 'react'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { formatNumber, formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const horizonChipClass = (active: boolean) =>
  active
    ? 'px-4 py-1.5 text-xs font-bold text-[var(--accent)] bg-[color:var(--panel-3)]'
    : 'px-4 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

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
  const [focusHorizon, setFocusHorizon] = useState(0)

  const selected = useMemo(
    () => data?.find((item) => item.pair.id === selectedPairId) ?? data?.[0] ?? null,
    [data, selectedPairId],
  )

  if (loading || !data || !selected) return <LoadingPanel label="Loading forecast studio…" />

  const ranked = [...data].sort((a, b) => b.forecast.confidence - a.forecast.confidence)
  const basePath = selected.forecast.basePath
  const firstValue = basePath[0]?.value ?? 0
  const lastValue = basePath.at(-1)?.value ?? firstValue
  const uncertaintyMax = Math.max(...selected.forecast.uncertaintyCurve)
  const driverEntries = Object.entries(selected.forecast.driverImportance).sort(([, a], [, b]) => b - a)
  const maxDriverValue = Math.max(...driverEntries.map(([, value]) => value), 1)
  const direction = lastValue >= firstValue ? 'Bullish' : 'Bearish'
  const diagnosticRows = [
    {
      label: 'Uncertainty index',
      value: uncertaintyMax < 0.04 ? 'Low' : uncertaintyMax < 0.08 ? 'Moderate' : 'High',
      width: Math.min(100, Math.max(16, uncertaintyMax * 900)),
      tone: 'accent',
    },
    {
      label: 'Event pressure',
      value: uncertaintyMax > 0.06 ? 'Elevated' : 'Contained',
      width: Math.min(100, Math.max(24, uncertaintyMax * 1200)),
      tone: uncertaintyMax > 0.06 ? 'danger' : 'default',
    },
    {
      label: 'Realized volatility',
      value: `${formatPercent(uncertaintyMax * 120, 1)}`,
      width: Math.min(100, Math.max(28, uncertaintyMax * 950)),
      tone: 'warning',
    },
  ] as const

  const focusedIndex = Math.min(focusHorizon, basePath.length - 1)
  const focusedPoint = basePath[focusedIndex]

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <header className="flex flex-col gap-5 border-b border-[color:rgba(141,164,179,0.14)] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.08em] text-[var(--text)]">{selected.pair.symbol}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Spot</span>
              <span className="text-xl font-bold tabular-nums text-[var(--accent)]">{formatNumber(firstValue, 4)}</span>
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
              setFocusHorizon(0)
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
            {selected.forecast.horizons.map((horizon, index) => (
              <button
                className={horizonChipClass(index === focusHorizon)}
                key={horizon}
                onClick={() => setFocusHorizon(index)}
                type="button"
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="bg-[color:var(--panel)] p-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Multi-horizon projection</h2>
            <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-[var(--accent)]" /> Mean path</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-[rgba(139,196,168,0.2)]" /> Upper band</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 bg-[rgba(227,128,120,0.16)]" /> Lower band</span>
            </div>
          </div>
          <div className="min-h-[420px] bg-[linear-gradient(90deg,rgba(123,208,255,0.08)_0%,rgba(105,211,192,0.03)_100%)] p-4">
            <ForecastChart forecast={selected.forecast} />
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-[color:rgba(141,164,179,0.14)] pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            <span>Current</span>
            {selected.forecast.horizons.map((horizon, index) => (
              <span key={`${horizon}-${index}`} className={index === focusHorizon ? 'text-[var(--accent)]' : ''}>
                {horizon}
              </span>
            ))}
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
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Focus horizon</div>
                <div className="bg-[color:var(--panel-2)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-[var(--text)]">{focusedPoint?.horizon ?? '-'}</span>
                    <span className="text-sm font-bold tabular-nums text-[var(--accent)]">{formatNumber(focusedPoint?.value ?? firstValue, 4)}</span>
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

      <section className="overflow-hidden bg-[color:var(--panel)] p-6">
        <h3 className="mb-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">Market alpha outlook</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4">
            {ranked.map(({ forecast, pair }) => {
              const start = forecast.basePath[0]?.value ?? 0
              const end = forecast.basePath.at(-1)?.value ?? start
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
                    setFocusHorizon(0)
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
