import { Link } from 'react-router-dom'
import { ForecastChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, Stat } from '../../components/ui/primitives'
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
  if (loading || !data) return <LoadingPanel label="Loading forecast studio…" />
  return (
    <Page title="Forecast Studio" description="Illustrative pair-linked forecasts that inherit pair narratives, volatility, and event pressure from the same core market model.">
      <div className="grid gap-6 xl:grid-cols-2">
        {data.map(({ forecast, pair }) => (
          <Panel key={forecast.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Illustrative forecast</div>
                <h2 className="mt-1 text-xl font-semibold">{pair.symbol}</h2>
              </div>
              <div className="text-sm text-[var(--muted)]">Confidence {formatPercent(forecast.confidence, 0)}</div>
            </div>
            <div className="mt-4">
              <ForecastChart forecast={forecast} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(forecast.driverImportance).map(([key, value]) => (
                <Stat key={key} label={key} value={formatPercent(value, 0)} />
              ))}
            </div>
            <div className="mt-4 flex justify-between text-sm text-[var(--muted)]">
              <span>{forecast.disclaimer}</span>
              <Link to={`/app/markets/${pair.id}`}>Open pair</Link>
            </div>
          </Panel>
        ))}
      </div>
    </Page>
  )
}
