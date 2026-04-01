import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PerformanceChart } from '../../components/charts/analytics'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { derivePortfolioExposure } from '../../domain/selectors'
import { formatCurrency, formatNumber } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const metricTone = (value: number) => (value >= 0 ? 'up' : 'down')

const CompactMetric = ({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) => (
  <div className="bg-[color:var(--panel-2)] px-4 py-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
    <div className={`mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.03em] ${tone === 'up' ? 'text-[var(--success)]' : tone === 'down' ? 'text-[var(--danger)]' : ''}`}>
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
    <Page title="Portfolio">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Panel className="overflow-hidden p-0">
          <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.3fr_0.7fr]">
            <div className="bg-[color:var(--panel-2)] px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Paper account</div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div className="font-display text-[2rem] font-semibold tracking-[-0.04em]">{data.portfolio.baseCurrency}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {data.openPositions.length} open · {data.closedPositions.length} closed · {journalCount} notes
                </div>
              </div>
            </div>
            <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
              <CompactMetric label="Balance" value={formatCurrency(data.portfolio.balance)} />
              <CompactMetric label="Equity" value={formatCurrency(data.portfolio.equity)} />
              <CompactMetric label="Margin used" value={formatCurrency(data.portfolio.marginUsed)} />
              <CompactMetric label="Free margin" value={formatCurrency(data.portfolio.freeMargin)} />
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Snapshot" title="Book" />
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Open pnl</div>
              <div className={`mt-2 font-display text-2xl font-semibold ${openTotal >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {formatCurrency(openTotal)}
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Realized pnl</div>
              <div className={`mt-2 font-display text-2xl font-semibold ${realizedTotal >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {formatCurrency(realizedTotal)}
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Win rate</div>
              <div className="mt-2 font-display text-2xl font-semibold">
                {data.closedPositions.length ? formatNumber((winCount / data.closedPositions.length) * 100, 0) : '0'}%
              </div>
            </div>
            <div className="bg-[color:var(--panel-2)] px-4 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Losses</div>
              <div className="mt-2 font-display text-2xl font-semibold text-[var(--danger)]">{lossCount}</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Panel>
          <SectionTitle eyebrow="Performance" title="Equity curve" />
          <PerformanceChart
            data={[
              { label: 'Start', equity: data.portfolio.startingBalance ?? data.portfolio.balance },
              ...data.closedPositions.map((_, index) => ({
                label: `T${index + 1}`,
                equity:
                  (data.portfolio.startingBalance ?? data.portfolio.balance) +
                  data.closedPositions.slice(0, index + 1).reduce((acc, item) => acc + (item.realizedPnL ?? 0), 0),
              })),
              { label: 'Now', equity: data.portfolio.equity },
            ]}
            labelKey="label"
            valueKey="equity"
          />
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Orders" title="Activity" />
          <div className="space-y-2">
            {data.orders.slice(0, 8).map((order) => (
              <div className="bg-[color:var(--panel-2)] px-4 py-3" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{order.action}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{order.pairId.toUpperCase()}</div>
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">{order.detail}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Panel>
          <SectionTitle eyebrow="Positions" title="Open book" />
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              className="border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-sm outline-none transition hover:bg-[color:var(--panel-3)]"
              value={openPairId}
              onChange={(event) => setOpenPairId(event.target.value)}
            >
              {seed.pairs.map((pair) => (
                <option key={pair.id} value={pair.id}>
                  {pair.symbol}
                </option>
              ))}
            </select>
            <button
              className="border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-sm uppercase tracking-[0.14em] transition hover:border-[var(--accent)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]"
              onClick={() => void appApi.openPaperTrade(appApi.buildSimulationFromPair(openPairId)).then(refresh)}
              type="button"
            >
              Open trade
            </button>
          </div>

          <div className="space-y-2">
            {data.openPositions.map((position) => (
              <div className="bg-[color:var(--panel-2)] px-4 py-4" key={position.id}>
                <div className="grid gap-3 xl:grid-cols-[1.05fr_0.8fr_0.8fr_0.8fr_0.7fr_auto]">
                  <div>
                    <Link className="font-display text-[1.25rem] font-semibold tracking-[-0.03em]" to={`/app/markets/${position.pairId}`}>
                      {position.pairId.toUpperCase()}
                    </Link>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {position.direction} · {position.leverage}x · {position.size.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Entry / Current</div>
                    <div className="mt-1 text-sm">{formatNumber(position.entry, 4)} / {formatNumber(position.currentPrice, 4)}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Stop / Target</div>
                    <div className="mt-1 text-sm">{formatNumber(position.stopLoss, 4)} / {formatNumber(position.takeProfit, 4)}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">PnL</div>
                    <div className={`mt-1 text-sm font-semibold ${metricTone(position.unrealizedPnL) === 'up' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {formatCurrency(position.unrealizedPnL)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Opened</div>
                    <div className="mt-1 text-sm">{new Date(position.openedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition hover:border-[var(--accent)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]"
                      onClick={() => void appApi.closePaperTrade(position.id).then(refresh)}
                      type="button"
                    >
                      Close
                    </button>
                    <Link
                      className="border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition hover:border-[var(--accent)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]"
                      to={`/app/simulation?pair=${position.pairId}`}
                    >
                      Duplicate
                    </Link>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Stop
                    <input
                      className="mt-2 w-full border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm outline-none transition hover:bg-[color:var(--panel-3)]"
                      defaultValue={position.stopLoss}
                      onBlur={(event) => void appApi.updatePaperTrade(position.id, { stopLoss: Number(event.target.value) }).then(refresh)}
                    />
                  </label>
                  <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Target
                    <input
                      className="mt-2 w-full border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm outline-none transition hover:bg-[color:var(--panel-3)]"
                      defaultValue={position.takeProfit}
                      onBlur={(event) => void appApi.updatePaperTrade(position.id, { takeProfit: Number(event.target.value) }).then(refresh)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle eyebrow="Closed" title="History" />
          <div className="grid gap-2 md:grid-cols-2">
            {data.closedPositions.map((position) => (
              <div className="bg-[color:var(--panel-2)] px-4 py-4" key={position.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-[1.05rem] font-semibold tracking-[-0.03em]">{position.pairId.toUpperCase()}</div>
                  <div className={`text-sm font-semibold ${metricTone(position.realizedPnL ?? 0) === 'up' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {formatCurrency(position.realizedPnL ?? 0)}
                  </div>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {position.direction} · {position.leverage}x
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionTitle eyebrow="Exposure" title="Currency concentration" />
            <div className="space-y-3">
              {data.exposure.map((item) => {
                const width = Math.min(100, Math.abs(item.value) / 1500)
                return (
                  <div className="bg-[color:var(--panel-2)] px-4 py-3" key={item.code}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.code}</div>
                      <div className={`text-sm font-semibold ${item.value >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{formatCurrency(item.value)}</div>
                    </div>
                    <div className="mt-3 h-1.5 bg-[color:var(--panel-4)]">
                      <div className="h-full bg-[linear-gradient(90deg,var(--accent),rgba(112,216,200,0.15))]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Journal" title="Notes" />
            <div className="space-y-3">
              <input
                className="w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 outline-none transition hover:bg-[color:var(--panel-3)]"
                placeholder="Title"
                value={journalTitle}
                onChange={(event) => setJournalTitle(event.target.value)}
              />
              <textarea
                className="min-h-28 w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 outline-none transition hover:bg-[color:var(--panel-3)]"
                placeholder="Note"
                value={journalBody}
                onChange={(event) => setJournalBody(event.target.value)}
              />
              <button
                className="border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition hover:border-[var(--accent)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]"
                onClick={() =>
                  void appApi.addJournalEntry({ title: journalTitle, body: journalBody }).then(() => {
                    setJournalTitle('')
                    setJournalBody('')
                    void refresh()
                  })
                }
                type="button"
              >
                Save note
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {data.journals.map((journal) => (
                <div className="bg-[color:var(--panel-2)] px-4 py-4" key={journal.id}>
                  <div className="font-medium">{journal.title}</div>
                  <div className="mt-2 text-sm text-[var(--muted)]">{journal.body}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
