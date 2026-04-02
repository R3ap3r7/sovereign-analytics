import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Forecast, PriceSeries } from '../../domain/types'

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(10, 16, 22, 0.96)',
    border: '1px solid rgba(141, 164, 179, 0.16)',
    borderRadius: '4px',
    color: '#edf4f7',
    boxShadow: '0 20px 80px rgba(3, 7, 11, 0.48)',
  },
  itemStyle: { color: '#edf4f7', fontSize: 11 },
  labelStyle: { color: '#8ea2af', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' },
  cursor: { stroke: 'rgba(105, 211, 192, 0.35)', strokeWidth: 1 },
}

const useChartSize = (height: number) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setWidth(Math.max(Math.floor(element.getBoundingClientRect().width), 240))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width, height }
}

export const PriceChart = ({
  series,
  showForecast = false,
  forecast,
  chartMode = 'line',
  overlays = ['ma', 'bands'],
}: {
  series: PriceSeries
  showForecast?: boolean
  forecast?: Forecast | null
  chartMode?: 'line' | 'area' | 'candlestick'
  overlays?: string[]
}) => {
  const data = series.points.map((point, index) => ({
    label: point.label,
    value: point.value,
    open: series.ohlcPoints[index]?.open ?? point.value,
    close: series.ohlcPoints[index]?.close ?? point.value,
    high: series.ohlcPoints[index]?.high ?? point.value,
    low: series.ohlcPoints[index]?.low ?? point.value,
    ma20: series.derivedIndicators.ma20[index],
    ma50: series.derivedIndicators.ma50[index],
    upper: series.derivedIndicators.upperBand[index],
    lower: series.derivedIndicators.lowerBand[index],
  }))
  const { ref, width, height } = useChartSize(288)
  return (
    <div className="h-72 min-w-0 w-full" ref={ref}>
      {width ? (
        <LineChart data={data} height={height} width={width}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#93a59a', fontSize: 10 }} />
          <YAxis tick={{ fill: '#93a59a', fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip {...chartTooltipProps} />
          <Legend />
          {chartMode === 'area' ? <Area dataKey="value" fill="rgba(139,196,168,0.18)" name="Price" stroke="#8bc4a8" strokeWidth={2} type="monotone" /> : null}
          {chartMode === 'line' ? <Line dataKey="value" name="Price" dot={false} stroke="#8bc4a8" strokeWidth={2} /> : null}
          {chartMode === 'candlestick' ? (
            <Bar dataKey="close" name="Close" radius={[4, 4, 0, 0]}>
              {data.map((item, index) => (
                <Cell fill={item.close >= item.open ? '#8bc4a8' : '#e38078'} key={`candle-${item.label}-${index}`} />
              ))}
            </Bar>
          ) : null}
          {overlays.includes('ma') ? <Line dataKey="ma20" name="MA20" dot={false} stroke="#d9b382" strokeWidth={1.5} /> : null}
          {overlays.includes('ma') ? <Line dataKey="ma50" name="MA50" dot={false} stroke="#91a7ff" strokeWidth={1.4} /> : null}
          {overlays.includes('bands') ? <Line dataKey="upper" name="Upper band" dot={false} stroke="rgba(239,244,238,0.2)" strokeDasharray="4 4" /> : null}
          {overlays.includes('bands') ? <Line dataKey="lower" name="Lower band" dot={false} stroke="rgba(239,244,238,0.2)" strokeDasharray="4 4" /> : null}
        </LineChart>
      ) : null}
      {showForecast && forecast ? (
        <div className="mt-3 text-xs text-[var(--muted)]">
          Forecast overlay widens from {forecast.basePath[0]?.horizon} to {forecast.basePath.at(-1)?.horizon}; illustrative only.
        </div>
      ) : null}
    </div>
  )
}

export const StrengthChart = ({ data }: { data: Array<{ code: string; strengthScore: number }> }) => {
  const { ref, width, height } = useChartSize(288)
  return (
    <div className="h-72 min-w-0 w-full" ref={ref}>
      {width ? (
      <BarChart data={data} height={height} width={width}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="code" tick={{ fill: '#93a59a' }} />
        <YAxis tick={{ fill: '#93a59a' }} />
        <Tooltip {...chartTooltipProps} />
        <Bar dataKey="strengthScore" fill="#8bc4a8" radius={[8, 8, 0, 0]} />
      </BarChart>
      ) : null}
    </div>
  )
}

export const ForecastChart = ({ forecast }: { forecast: Forecast }) => {
  const data = forecast.basePath.map((point, index) => ({
    horizon: point.horizon,
    base: point.value,
    optimistic: forecast.optimisticPath[index]?.value,
    pessimistic: forecast.pessimisticPath[index]?.value,
  }))
  const { ref, width, height } = useChartSize(256)
  return (
    <div className="h-64 min-w-0 w-full" ref={ref}>
      {width ? (
        <AreaChart data={data} height={height} width={width}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="horizon" tick={{ fill: '#93a59a' }} />
          <YAxis tick={{ fill: '#93a59a' }} domain={['auto', 'auto']} />
          <Tooltip {...chartTooltipProps} />
          <Area dataKey="optimistic" stroke="#8bc4a8" fill="rgba(139,196,168,0.22)" />
          <Area dataKey="pessimistic" stroke="#e38078" fill="rgba(227,128,120,0.12)" />
          <Line type="monotone" dataKey="base" stroke="#eff4ee" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      ) : null}
    </div>
  )
}

export const PerformanceChart = ({
  data,
  valueKey,
  labelKey,
}: {
  data: Array<Record<string, number | string>>
  valueKey: string
  labelKey: string
}) => {
  const { ref, width, height } = useChartSize(240)
  return (
    <div className="h-60 min-w-0 w-full" ref={ref}>
      {width ? (
        <LineChart data={data} height={height} width={width}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fill: '#93a59a', fontSize: 10 }} />
          <YAxis tick={{ fill: '#93a59a', fontSize: 10 }} />
          <Tooltip {...chartTooltipProps} />
          <Line dataKey={valueKey} dot={false} stroke="#8bc4a8" strokeWidth={2} />
        </LineChart>
      ) : null}
    </div>
  )
}
