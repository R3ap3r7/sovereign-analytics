import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PerformanceChart } from '../../components/charts/analytics'
import { LoadingPanel } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/api'
import { derivePortfolioExposure } from '../../domain/selectors'
import { formatCurrency, formatNumber } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const metricTone = (value: number) => (value >= 0 ? 'up' : 'down')

const CompactMetric = ({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) => (
  <div className="bg-[color:var(--panel)] px-4 py-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
    <div className={`mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.03em] ${tone === 'up' ? 'text-[var(--accent)]' : tone === 'down' ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}>
      {value}
    </div>
  </div>
)

export const PortfolioPage = () => {
  const { data, loading, setData } = useAsyncResource(async () => {
    const seed = getSeed()
    const portfolioData = await appApi.getPortfolioWorkspace()
    if (!portfolioData) return null
    return {
      ...portfolioData,
      exposure: derivePortfolioExposure(portfolioData.openPositions, seed.pairs, seed.currencies),
    }
  }, [])
  const [journalTitle, setJournalTitle] = useState('')
  const [journalBody, setJournalBody] = useState('')
  const [openPairId, setOpenPairId] = useState('eur-usd')

  if (loading || !data) return <LoadingPanel label="Loading portfolio…" />

  const seed = getSeed()
  const realizedTotal = data.closedPositions.reduce((acc, item) => acc + (item.realizedPnL ?? 0), 0)
  const openTotal = data.openPositions.reduce((acc, item) => acc + item.unrealizedPnL, 0)
  const winCount = data.closedPositions.filter((item) => (item.realizedPnL ?? 0) >= 0).length
  const lossCount = data.closedPositions.filter((item) => (item.realizedPnL ?? 0) < 0).length
  const journalCount = data.journals.length
  const quickPair = seed.pairs.find((pair) => pair.id === openPairId) ?? seed.pairs[0]
  const equitySeries = [
    { label: 'Start', equity: data.portfolio.startingBalance ?? data.portfolio.balance },
    ...data.closedPositions.map((_, index) => ({
      label: `T${index + 1}`,
      equity:
        (data.portfolio.startingBalance ?? data.portfolio.balance) +
        data.closedPositions.slice(0, index + 1).reduce((acc, item) => acc + (item.realizedPnL ?? 0), 0),
    })),
    { label: 'Now', equity: data.portfolio.equity },
  ]

  const refresh = async () => {
    const seedSnapshot = getSeed()
    const portfolioData = await appApi.getPortfolioWorkspace()
    if (!portfolioData) return
    setData({
      ...portfolioData,
      exposure: derivePortfolioExposure(portfolioData.openPositions, seedSnapshot.pairs, seedSnapshot.currencies),
    })
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-0.5 overflow-hidden bg-[color:var(--panel-4)] lg:grid-cols-5">
        <CompactMetric label="Account balance" value={`${formatCurrency(data.portfolio.balance)} ${data.portfolio.baseCurrency}`} />
        <CompactMetric label="Equity" value={formatCurrency(data.portfolio.equity)} />
        <CompactMetric label="Free margin" tone="up" value={formatCurrency(data.portfolio.freeMargin)} />
        <CompactMetric label="Open pnl" tone={openTotal >= 0 ? 'up' : 'down'} value={formatCurrency(openTotal)} />
        <CompactMetric label="Realized pnl" tone={realizedTotal >= 0 ? 'up' : 'down'} value={formatCurrency(realizedTotal)} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden bg-[color:var(--panel)]">
          <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-4 py-2">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Equity Curve</span>
              <span className="text-[10px] text-[var(--muted)]">{data.openPositions.length} open · {data.closedPositions.length} closed · {journalCount} notes</span>
            </div>
            <div className="flex gap-2">
              {['1H', '4H', '1D'].map((range) => (
                <button key={range} type="button" className={range === '4H' ? 'bg-[color:var(--panel-3)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]' : 'bg-[color:var(--panel)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]'}>
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <PerformanceChart data={equitySeries} labelKey="label" valueKey="equity" />
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-[color:var(--panel)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
              Exposure Concentration
            </div>
            <div className="p-4 space-y-4">
              {data.exposure.slice(0, 5).map((item) => {
                const width = Math.min(100, Math.abs(item.value) / 1500)
                return (
                  <div key={item.code} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
                      <span className="text-[var(--text)]">{item.code}</span>
                      <span className={item.value >= 0 ? 'tabular-nums text-[var(--accent)]' : 'tabular-nums text-[var(--danger)]'}>{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-[color:var(--panel-3)]">
                      <div className={item.value >= 0 ? 'h-full bg-[var(--accent)]' : 'h-full bg-[var(--warning)]'} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="overflow-hidden bg-[color:var(--panel)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
              Quick Execution
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[color:var(--panel-2)] p-2">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Symbol</div>
                  <div className="mt-1 text-sm font-bold text-[var(--text)]">{quickPair.symbol}</div>
                </div>
                <div className="bg-[color:var(--panel-2)] p-2">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Volume</div>
                  <div className="mt-1 text-sm font-bold tabular-nums text-[var(--text)]">1.00 LOT</div>
                </div>
              </div>
              <select
                className="w-full bg-[color:var(--panel-2)] px-3 py-2 text-sm outline-none"
                value={openPairId}
                onChange={(event) => setOpenPairId(event.target.value)}
              >
                {seed.pairs.map((pair) => (
                  <option key={pair.id} value={pair.id}>{pair.symbol}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void appApi.openPaperTrade({ ...appApi.buildSimulationFromPair(openPairId), direction: 'short' }).then(refresh)}
                  className="border border-[color:rgba(227,128,120,0.3)] bg-[rgba(227,128,120,0.08)] py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--danger)]"
                >
                  Sell
                </button>
                <button
                  type="button"
                  onClick={() => void appApi.openPaperTrade(appApi.buildSimulationFromPair(openPairId)).then(refresh)}
                  className="border border-[color:rgba(105,211,192,0.3)] bg-[rgba(105,211,192,0.08)] py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]"
                >
                  Buy
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden bg-[color:var(--panel)]">
          <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">Active Portfolio Positions</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">count {data.openPositions.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-[color:var(--panel-4)] text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Lots</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Current</th>
                  <th className="px-4 py-3 font-medium">S / T</th>
                  <th className="px-4 py-3 font-medium">Opened</th>
                  <th className="px-4 py-3 text-right font-medium">PnL</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.openPositions.map((position) => {
                  const pair = seed.pairs.find((item) => item.id === position.pairId)
                  return (
                    <tr key={position.id} className="border-t border-[color:rgba(141,164,179,0.08)]">
                      <td className="px-4 py-3">
                        <Link to={`/app/markets/${position.pairId}`} className="font-semibold text-[var(--accent)]">
                          {pair?.symbol ?? position.pairId.toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-4 py-3 uppercase text-[var(--muted)]">{position.direction}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(position.size, 0)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(position.entry, 4)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(position.currentPrice, 4)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(position.stopLoss, 4)} / {formatNumber(position.takeProfit, 4)}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{new Date(position.openedAt).toLocaleDateString()}</td>
                      <td className={metricTone(position.unrealizedPnL) === 'up' ? 'px-4 py-3 text-right font-semibold text-[var(--accent)]' : 'px-4 py-3 text-right font-semibold text-[var(--danger)]'}>
                        {formatCurrency(position.unrealizedPnL)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link to={`/app/simulation?pair=${position.pairId}`} className="bg-[color:var(--panel-2)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
                            Duplicate
                          </Link>
                          <button
                            type="button"
                            onClick={() => void appApi.closePaperTrade(position.id).then(refresh)}
                            className="bg-[color:var(--panel-2)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--danger)]"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden bg-[color:var(--panel)]">
          <div className="bg-[color:var(--panel-2)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
            Order Activity
          </div>
          <div className="p-4 space-y-2">
            {data.orders.slice(0, 8).map((order) => (
              <div key={order.id} className="bg-[color:var(--panel-2)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{order.action}</div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{order.pairId.toUpperCase()}</div>
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">{order.detail}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="overflow-hidden bg-[color:var(--panel)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
              Closed Positions
            </div>
            <div className="grid gap-2 p-4 md:grid-cols-2">
              {data.closedPositions.map((position) => {
                const pair = seed.pairs.find((item) => item.id === position.pairId)
                return (
                  <div key={position.id} className="bg-[color:var(--panel-2)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--text)]">{pair?.symbol ?? position.pairId.toUpperCase()}</div>
                      <div className={metricTone(position.realizedPnL ?? 0) === 'up' ? 'text-sm font-semibold text-[var(--accent)]' : 'text-sm font-semibold text-[var(--danger)]'}>
                        {formatCurrency(position.realizedPnL ?? 0)}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{position.direction} · {position.leverage}x</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="overflow-hidden bg-[color:var(--panel)]">
            <div className="bg-[color:var(--panel-2)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">
              Journal
            </div>
            <div className="p-4 space-y-3">
              <input
                className="w-full bg-[color:var(--panel-2)] px-4 py-3 outline-none"
                placeholder="Title"
                value={journalTitle}
                onChange={(event) => setJournalTitle(event.target.value)}
              />
              <textarea
                className="min-h-32 w-full bg-[color:var(--panel-2)] px-4 py-3 outline-none"
                placeholder="Write a portfolio observation..."
                value={journalBody}
                onChange={(event) => setJournalBody(event.target.value)}
              />
              <button
                type="button"
                onClick={() =>
                  void appApi.addJournalEntry({ title: journalTitle, body: journalBody }).then(() => {
                    setJournalTitle('')
                    setJournalBody('')
                    void refresh()
                  })
                }
                className="bg-[var(--accent)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--bg)]"
              >
                Add Journal
              </button>
              <div className="space-y-2">
                {data.journals.map((journal) => (
                  <div key={journal.id} className="bg-[color:var(--panel-2)] p-3">
                    <div className="text-sm font-semibold text-[var(--text)]">{journal.title}</div>
                    <div className="mt-2 text-xs leading-6 text-[var(--muted)]">{journal.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[color:var(--panel)] p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Book Snapshot</div>
          <div className="mt-4 grid gap-2">
            <div className="bg-[color:var(--panel-2)] p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Win Rate</div>
              <div className="mt-2 text-lg font-bold tabular-nums text-[var(--text)]">
                {data.closedPositions.length ? formatNumber((winCount / data.closedPositions.length) * 100, 0) : '0'}%
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Losses</div>
              <div className="mt-2 text-lg font-bold tabular-nums text-[var(--danger)]">{lossCount}</div>
            </div>
            <div className="bg-[color:var(--panel-2)] p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Margin Used</div>
              <div className="mt-2 text-lg font-bold tabular-nums text-[var(--text)]">{formatCurrency(data.portfolio.marginUsed)}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
