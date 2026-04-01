import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Forecast, PriceSeries } from '../../domain/types'

export const PriceChart = ({ series, showForecast = false, forecast }: { series: PriceSeries; showForecast?: boolean; forecast?: Forecast | null }) => {
  const data = series.points.map((point, index) => ({
    label: point.label,
    value: point.value,
    ma20: series.derivedIndicators.ma20[index],
    ma50: series.derivedIndicators.ma50[index],
    upper: series.derivedIndicators.upperBand[index],
    lower: series.derivedIndicators.lowerBand[index],
  }))
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#93a59a', fontSize: 10 }} />
          <YAxis tick={{ fill: '#93a59a', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Line dataKey="value" name="Price" dot={false} stroke="#8bc4a8" strokeWidth={2} />
          <Line dataKey="ma20" name="MA20" dot={false} stroke="#d9b382" strokeWidth={1.5} />
          <Line dataKey="ma50" name="MA50" dot={false} stroke="#91a7ff" strokeWidth={1.4} />
          <Line dataKey="upper" name="Upper band" dot={false} stroke="rgba(239,244,238,0.2)" strokeDasharray="4 4" />
          <Line dataKey="lower" name="Lower band" dot={false} stroke="rgba(239,244,238,0.2)" strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
      {showForecast && forecast ? (
        <div className="mt-3 text-xs text-[var(--muted)]">
          Forecast overlay widens from {forecast.basePath[0]?.horizon} to {forecast.basePath.at(-1)?.horizon}; illustrative only.
        </div>
      ) : null}
    </div>
  )
}

export const StrengthChart = ({ data }: { data: Array<{ code: string; strengthScore: number }> }) => (
  <div className="h-72 w-full">
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="code" tick={{ fill: '#93a59a' }} />
        <YAxis tick={{ fill: '#93a59a' }} />
        <Tooltip />
        <Bar dataKey="strengthScore" fill="#8bc4a8" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
)

export const ForecastChart = ({ forecast }: { forecast: Forecast }) => {
  const data = forecast.basePath.map((point, index) => ({
    horizon: point.horizon,
    base: point.value,
    optimistic: forecast.optimisticPath[index]?.value,
    pessimistic: forecast.pessimisticPath[index]?.value,
  }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="horizon" tick={{ fill: '#93a59a' }} />
          <YAxis tick={{ fill: '#93a59a' }} domain={['auto', 'auto']} />
          <Tooltip />
          <Area dataKey="optimistic" stroke="#8bc4a8" fill="rgba(139,196,168,0.22)" />
          <Area dataKey="pessimistic" stroke="#e38078" fill="rgba(227,128,120,0.12)" />
          <Line type="monotone" dataKey="base" stroke="#eff4ee" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
