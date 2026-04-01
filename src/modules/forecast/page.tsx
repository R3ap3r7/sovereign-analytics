import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const chipClass =
  'border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const Label = ({ children }: { children: string }) => (
  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{children}</div>
)

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
  const selected = useMemo(() => data?.find((item) => item.pair.id === selectedPairId) ?? data?.[0] ?? null, [data, selectedPairId])

  if (loading || !data || !selected) return <LoadingPanel label="Loading forecast studio…" />

  const ranked = [...data].sort((a, b) => b.forecast.confidence - a.forecast.confidence)
  const firstValue = selected.forecast.basePath[0]?.value ?? 0
  const lastValue = selected.forecast.basePath.at(-1)?.value ?? firstValue
  const biasLabel = lastValue > firstValue ? 'Bullish edge' : 'Bearish edge'
  const basePathLabel = selected.forecast.basePath
    .map((point) => `${point.horizon} ${point.value.toFixed(2)}`)
    .join(' · ')

  return (
    <Page title="Forecast Studio">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel className="overflow-hidden p-0">
          <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.08fr_0.92fr]">
            <div className="bg-[color:var(--panel-2)] px-5 py-5">
              <Label>Selected pair</Label>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <h2 className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{selected.pair.symbol}</h2>
                <span className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Confidence {formatPercent(selected.forecast.confidence, 0)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Horizons" value={selected.forecast.horizons.length} />
                <Stat label="Drivers" value={Object.keys(selected.forecast.driverImportance).length} />
                <Stat label="Bands" value={selected.forecast.uncertaintyCurve.length} />
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Bias</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{biasLabel}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Uncertainty</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{formatPercent(Math.max(...selected.forecast.uncertaintyCurve) * 100, 1)}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Base path</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{basePathLabel}</div>
              </div>
              <div className="bg-[color:var(--panel)] px-4 py-4">
                <Label>Target pair</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{selected.pair.symbol}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Pairs" title="Selector" />
          <div className="grid gap-2">
            {data.map(({ pair, forecast }) => (
              <button
                className={[
                  chipClass,
                  pair.id === selected.pair.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'text-[var(--muted)]',
                ].join(' ')}
                key={pair.id}
                onClick={() => setSelectedPairId(pair.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{pair.symbol}</span>
                  <span className="text-[11px] tracking-[0.12em] text-[var(--muted)]">{formatPercent(forecast.confidence, 0)}</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionTitle eyebrow="Fan chart" title="Forecast view" />
          <ForecastChart forecast={selected.forecast} />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(selected.forecast.driverImportance).map(([key, value]) => (
              <Stat key={key} label={key} value={formatPercent(value, 0)} />
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Range" title="Confidence bands" />
            <div className="grid gap-px bg-[var(--line)]">
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Uncertainty curve</Label>
                <div className="mt-2 text-sm text-[var(--text)]">
                  {selected.forecast.uncertaintyCurve.map((value) => formatPercent(value * 100, 1)).join(' · ')}
                </div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Horizon map</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{selected.forecast.horizons.join(' · ')}</div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Disclaimer</Label>
                <div className="mt-2 text-sm leading-6 text-[var(--text)]">{selected.forecast.disclaimer}</div>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Ranked" title="Confidence board" />
            <div className="space-y-2">
              {ranked.map(({ forecast, pair }) => (
                <button
                  className={`flex w-full items-center justify-between border px-4 py-3 text-left transition ${
                    pair.id === selected.pair.id
                      ? 'border-[var(--accent)] bg-[color:var(--accent)]/8'
                      : 'border-[var(--line)] bg-[color:var(--panel-2)]/60 hover:border-[var(--accent)]/50 hover:bg-[color:var(--panel-3)]'
                  }`}
                  key={forecast.id}
                  onClick={() => setSelectedPairId(pair.id)}
                  type="button"
                >
                  <div>
                    <div className="font-medium text-[var(--text)]">{pair.symbol}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Uncertainty {formatPercent(Math.max(...forecast.uncertaintyCurve) * 100, 1)}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">Confidence {formatPercent(forecast.confidence, 0)}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Route" title="Pair link" />
            <div className="grid gap-px bg-[var(--line)]">
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Open pair</Label>
                <div className="mt-2">
                  <Link className="text-[var(--accent)]" to={`/app/markets/${selected.pair.id}`}>
                    {selected.pair.symbol}
                  </Link>
                </div>
              </div>
              <div className="bg-[color:var(--panel-2)] px-4 py-4">
                <Label>Selected bias</Label>
                <div className="mt-2 text-sm text-[var(--text)]">{biasLabel}</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
