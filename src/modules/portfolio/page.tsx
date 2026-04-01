import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { derivePortfolioExposure } from '../../domain/selectors'
import { formatCurrency } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

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
  if (loading || !data) return <LoadingPanel label="Loading portfolio workspace…" />
  const refresh = async () => {
    const seed = getSeed()
    const portfolioData = await appApi.getPortfolioWorkspace()
    if (!portfolioData) return
    setData({
      ...portfolioData,
      exposure: derivePortfolioExposure(portfolioData.openPositions, seed.pairs, seed.currencies),
    })
  }
  return (
    <Page title="Virtual Portfolio" description="Paper-account exposures, open and closed positions, order history, and linked journal context from the same pair universe.">
      <Panel className="grid gap-4 lg:grid-cols-4">
        <Stat label="Balance" value={formatCurrency(data.portfolio.balance)} />
        <Stat label="Equity" value={formatCurrency(data.portfolio.equity)} />
        <Stat label="Margin used" value={formatCurrency(data.portfolio.marginUsed)} />
        <Stat label="Free margin" value={formatCurrency(data.portfolio.freeMargin)} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle eyebrow="Open positions" title="Live paper trades" />
          <div className="mb-4 flex flex-wrap gap-3">
            <select className="rounded-full border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-2 text-sm" value={openPairId} onChange={(event) => setOpenPairId(event.target.value)}>
              {getSeed().pairs.map((pair) => (
                <option key={pair.id} value={pair.id}>{pair.symbol}</option>
              ))}
            </select>
            <button className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" onClick={() => void appApi.openPaperTrade(appApi.buildSimulationFromPair(openPairId)).then(refresh)} type="button">
              Open demo trade
            </button>
          </div>
          <div className="space-y-3">
            {data.openPositions.map((position) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={position.id}>
                <div className="flex items-center justify-between gap-3">
                  <Link className="font-medium" to={`/app/markets/${position.pairId}`}>{position.pairId.toUpperCase()}</Link>
                  <div className="text-sm">{position.direction}</div>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">Unrealized {formatCurrency(position.unrealizedPnL)} · Leverage {position.leverage}x</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input className="rounded-xl border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm" defaultValue={position.stopLoss} onBlur={(event) => void appApi.updatePaperTrade(position.id, { stopLoss: Number(event.target.value) }).then(refresh)} />
                  <input className="rounded-xl border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 text-sm" defaultValue={position.takeProfit} onBlur={(event) => void appApi.updatePaperTrade(position.id, { takeProfit: Number(event.target.value) }).then(refresh)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => void appApi.closePaperTrade(position.id).then(refresh)} type="button">Close trade</button>
                  <Link className="rounded-full border border-[var(--line)] px-3 py-1 text-xs" to={`/app/simulation?pair=${position.pairId}`}>Duplicate to simulation</Link>
                </div>
              </div>
            ))}
          </div>
          <SectionTitle eyebrow="Closed positions" title="Realized history" />
          <div className="space-y-3">
            {data.closedPositions.map((position) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={position.id}>
                <div className="font-medium">{position.pairId.toUpperCase()}</div>
                <div className="mt-2 text-sm text-[var(--muted)]">Realized {formatCurrency(position.realizedPnL ?? 0)}</div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <SectionTitle eyebrow="Exposure concentration" title="Directional currency exposure" />
            <div className="space-y-3">
              {data.exposure.map((item) => (
                <div className="rounded-2xl border border-[var(--line)] px-4 py-3" key={item.code}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{item.code}</div>
                    <div className="text-sm text-[var(--muted)]">{formatCurrency(item.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Journal" title="Trading notes" />
            <div className="mb-4 space-y-3">
              <input className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="Journal title" value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} />
              <textarea className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="What changed in your risk view?" value={journalBody} onChange={(event) => setJournalBody(event.target.value)} />
              <button className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" onClick={() => void appApi.addJournalEntry({ title: journalTitle, body: journalBody }).then(() => {
                setJournalTitle('')
                setJournalBody('')
                void refresh()
              })} type="button">
                Save journal entry
              </button>
            </div>
            <div className="space-y-3">
              {data.journals.map((journal) => (
                <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={journal.id}>
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
