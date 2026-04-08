import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Forecast, ForecastDailyPoint, PriceSeries } from '../../domain/types'
import { formatNumber } from '../../lib/utils'

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
          Forecast overlay spans {forecast.basePath[0]?.horizon} through {forecast.basePath.at(-1)?.horizon} with model-derived uncertainty bands.
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

const formatForecastAxisDate = (value: string) => {
  if (value.startsWith('D+')) return value
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

const ForecastTooltip = ({
  active,
  payload,
  label,
  displayMode,
  displayPrecision,
}: {
  active?: boolean
  payload?: Array<{ payload: Record<string, number | string> }>
  label?: string
  displayMode: 'price' | 'move'
  displayPrecision: number
}) => {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as {
    date: string
    day: number
    base: number
    upper: number
    lower: number
    uncertaintyBps: number
    moveBps: number
    upperMoveBps: number
    lowerMoveBps: number
  }
  const movePct = point.moveBps / 100

  return (
    <div className="min-w-[220px] border border-[color:rgba(141,164,179,0.16)] bg-[rgba(10,16,22,0.98)] p-3 text-[11px] text-[var(--text)] shadow-[0_20px_80px_rgba(3,7,11,0.48)]">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-[color:rgba(141,164,179,0.12)] pb-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{label ? formatForecastAxisDate(label) : point.date}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--text)]">Day {point.day}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Move vs spot</div>
          <div className={movePct >= 0 ? 'text-xs font-bold text-[var(--success)]' : 'text-xs font-bold text-[var(--danger)]'}>
            {movePct >= 0 ? '+' : ''}{formatNumber(movePct, 2)}%
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--muted)]">Mean</span>
          <span className="font-semibold text-[var(--text)]">
            {displayMode === 'price' ? formatNumber(point.base, displayPrecision) : `${point.moveBps >= 0 ? '+' : ''}${formatNumber(point.moveBps, 0)} bps`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--muted)]">Upper</span>
          <span className="font-semibold text-[var(--success)]">
            {displayMode === 'price' ? formatNumber(point.upper, displayPrecision) : `${point.upperMoveBps >= 0 ? '+' : ''}${formatNumber(point.upperMoveBps, 0)} bps`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--muted)]">Lower</span>
          <span className="font-semibold text-[var(--danger)]">
            {displayMode === 'price' ? formatNumber(point.lower, displayPrecision) : `${point.lowerMoveBps >= 0 ? '+' : ''}${formatNumber(point.lowerMoveBps, 0)} bps`}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[color:rgba(141,164,179,0.12)] pt-2">
          <span className="text-[var(--muted)]">Band width</span>
          <span className="font-semibold text-[var(--warning)]">{formatNumber(point.uncertaintyBps, 0)} bps</span>
        </div>
      </div>
    </div>
  )
}

export const buildFallbackDailyPath = (input: Forecast) => {
  const anchors = [0, 5, 21, 63]
  const values = [
    input.spotPrice ?? input.basePath[0]?.value ?? 0,
    ...(input.basePath.map((point) => point.value)),
  ]
  const uncertainties = [0, ...(input.uncertaintyCurve ?? [])]

  return Array.from({ length: 63 }, (_, index) => {
    const day = index + 1
    const nextIndex = anchors.findIndex((anchor) => anchor >= day)
    const upperIndex = nextIndex === -1 ? anchors.length - 1 : nextIndex
    const lowerIndex = Math.max(0, upperIndex - 1)
    const ratio = (day - anchors[lowerIndex]) / Math.max(1, anchors[upperIndex] - anchors[lowerIndex])
    const lowerLog = Math.log(values[lowerIndex] || values[0] || 1)
    const upperLog = Math.log(values[upperIndex] || values.at(-1) || 1)
    return {
      day,
      date: `D+${day}`,
      label: `D+${day}`,
      value: Number(Math.exp(lowerLog + ((upperLog - lowerLog) * ratio)).toFixed(5)),
      uncertainty: Number(((uncertainties[lowerIndex] ?? 0) + (((uncertainties[upperIndex] ?? 0) - (uncertainties[lowerIndex] ?? 0)) * ratio)).toFixed(5)),
    } satisfies ForecastDailyPoint
  })
}

export const ForecastChart = ({
  forecast,
  windowDays = 21,
  bandScale = 1,
  displayMode = 'price',
  displayPrecision = 4,
}: {
  forecast: Forecast
  windowDays?: number
  bandScale?: number
  displayMode?: 'price' | 'move'
  displayPrecision?: number
}) => {
  const dailyPath = (forecast.dailyPath?.length ? forecast.dailyPath : buildFallbackDailyPath(forecast)).slice(0, windowDays)
  const spotPrice = forecast.spotPrice ?? dailyPath[0]?.value ?? forecast.basePath[0]?.value ?? 0
  const data = dailyPath.map((point) => {
    const upper = point.value * Math.exp(point.uncertainty * bandScale)
    const lower = point.value * Math.exp(-point.uncertainty * bandScale)
    const toBps = (value: number) => (spotPrice ? ((value - spotPrice) / spotPrice) * 10000 : 0)
    return {
      label: point.label || point.date,
      date: point.date,
      day: point.day,
      base: displayMode === 'price' ? point.value : toBps(point.value),
      upper: displayMode === 'price' ? upper : toBps(upper),
      lower: displayMode === 'price' ? lower : toBps(lower),
      bandBase: displayMode === 'price' ? lower : toBps(lower),
      bandSize: displayMode === 'price' ? upper - lower : toBps(upper) - toBps(lower),
      uncertaintyBps: point.uncertainty * 10000 * bandScale,
      moveBps: toBps(point.value),
      upperMoveBps: toBps(upper),
      lowerMoveBps: toBps(lower),
    }
  })
  const values = data.flatMap((point) => [point.lower, point.base, point.upper])
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const span = Math.max(maxValue - minValue, displayMode === 'price' ? Math.max(spotPrice * 0.0025, 0.0001) : 12)
  const pad = span * 0.18
  const yDomain: [number, number] = [minValue - pad, maxValue + pad]
  const { ref, width, height } = useChartSize(320)
  const referenceValue = displayMode === 'price' ? spotPrice : 0

  return (
    <div className="h-80 min-w-0 w-full" ref={ref}>
      {width ? (
        <AreaChart data={data} height={height} width={width}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <defs>
            <linearGradient id="forecast-band" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(105,211,192,0.32)" />
              <stop offset="100%" stopColor="rgba(105,211,192,0.02)" />
            </linearGradient>
            <linearGradient id="forecast-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7bd0ff" />
              <stop offset="100%" stopColor="#69d3c0" />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" minTickGap={28} tick={{ fill: '#93a59a', fontSize: 10 }} tickFormatter={formatForecastAxisDate} />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#93a59a', fontSize: 10 }}
            tickFormatter={(value) => displayMode === 'price' ? formatNumber(Number(value), displayPrecision) : `${formatNumber(Number(value), 0)}bps`}
          />
          <Tooltip
            content={(
              <ForecastTooltip
                displayMode={displayMode}
                displayPrecision={displayPrecision}
              />
            )}
            cursor={{ stroke: 'rgba(123, 208, 255, 0.3)', strokeWidth: 1 }}
          />
          <ReferenceLine
            ifOverflow="extendDomain"
            stroke="rgba(141,164,179,0.3)"
            strokeDasharray="4 4"
            y={referenceValue}
          />
          <Area dataKey="bandBase" fill="transparent" stackId="forecast-band-stack" stroke="transparent" />
          <Area dataKey="bandSize" fill="url(#forecast-band)" stackId="forecast-band-stack" stroke="transparent" />
          <Line activeDot={{ r: 5, stroke: '#0a1016', strokeWidth: 1.5 }} dataKey="base" dot={false} stroke="url(#forecast-line)" strokeWidth={2.5} type="monotone" />
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

export function MLPathsChart({ paths, threshold }: { paths: number[]; threshold: number }) {
  const data = paths.map((value, index) => ({ index, value }));
  const minVal = Math.min(...paths, threshold) - 5;
  const maxVal = Math.max(...paths) + 5;
  return (
    <div className="mt-2">
      <p className="text-xs text-neutral-500 mb-1">Monte Carlo Path Distribution (200 samples)</p>
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[minVal, maxVal]} hide />
          <Tooltip
            formatter={(val: number) => [`${val.toFixed(1)} pips`, 'Simulated Move']}
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
            labelStyle={{ display: 'none' }}
          />
          <Scatter dataKey="value" fill="#8b5cf6" opacity={0.4} />
          <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'MC', fill: '#ef4444', fontSize: 10 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
