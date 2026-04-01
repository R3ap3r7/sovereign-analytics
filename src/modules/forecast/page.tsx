import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

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
  return (
    <Page title="Forecast Studio" description="Illustrative pair-linked forecasts that inherit pair narratives, volatility, and event pressure from the same core market model.">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <SectionTitle eyebrow="Selected forecast" title={selected.pair.symbol} detail={selected.forecast.disclaimer} />
          <div className="mb-4 flex flex-wrap gap-2">
            {data.slice(0, 8).map(({ pair }) => (
              <button className={`rounded-full border px-3 py-1.5 text-xs ${pair.id === selected.pair.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'}`} key={pair.id} onClick={() => setSelectedPairId(pair.id)} type="button">
                {pair.symbol}
              </button>
            ))}
          </div>
          <ForecastChart forecast={selected.forecast} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Object.entries(selected.forecast.driverImportance).map(([key, value]) => (
              <Stat key={key} label={key} value={formatPercent(value, 0)} />
            ))}
          </div>
          <div className="mt-4 flex justify-between text-sm text-[var(--muted)]">
            <span>Confidence {formatPercent(selected.forecast.confidence, 0)}</span>
            <Link to={`/app/markets/${selected.pair.id}`}>Open pair</Link>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Comparison table" title="Uncertainty and conviction ranking" />
          <div className="space-y-3">
            {[...data]
              .sort((a, b) => b.forecast.confidence - a.forecast.confidence)
              .map(({ forecast, pair }) => (
                <button className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4 text-left" key={forecast.id} onClick={() => setSelectedPairId(pair.id)} type="button">
                  <div>
                    <div className="font-medium">{pair.symbol}</div>
                    <div className="text-sm text-[var(--muted)]">Uncertainty {formatPercent(Math.max(...forecast.uncertaintyCurve) * 100, 1)}</div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">Confidence {formatPercent(forecast.confidence, 0)}</div>
                </button>
              ))}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
