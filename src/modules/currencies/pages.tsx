import { Link, useParams } from 'react-router-dom'
import { NoteCard, PairCard, NewsCard } from '../../components/domain/cards'
import { Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatNumber, formatPercent } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

export const CurrenciesPage = () => {
  const { data, loading } = useAsyncResource(() => appApi.listCurrencies(), [])
  if (loading || !data) return <LoadingPanel label="Loading currency intelligence…" />
  return (
    <Page title="Currency Intelligence" description="Country and currency profiles feed pair narratives, dashboard relevance, event risk, and forecast context across the platform.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((currency) => (
          <Link key={currency.code} to={`/app/currencies/${currency.code}`}>
            <Panel className="h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{currency.regionName}</div>
                  <h2 className="mt-1 text-xl font-semibold">{currency.code}</h2>
                </div>
                <Badge tone={currency.strengthScore > 65 ? 'accent' : currency.riskScore > 65 ? 'warning' : 'default'}>{currency.classificationTags[0]}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{currency.currentSummary}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Strength" value={formatPercent(currency.strengthScore, 0)} />
                <Stat label="Risk" value={formatPercent(currency.riskScore, 0)} />
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </Page>
  )
}

export const CurrencyDetailPage = () => {
  const { user } = useAppState()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getCurrencyWorkspace(params.currencyCode ?? ''), [params.currencyCode, user?.id])
  if (loading || !data) return <LoadingPanel label="Loading currency profile…" />
  const { currency, pairs, events, news, notes } = data
  return (
    <Page title={`${currency.code} · ${currency.name}`} description="Currency profile, macro drivers, central bank tone, linked pairs, events, news, and contextual notes.">
      <Panel className="grid gap-4 lg:grid-cols-4">
        <Stat label="Strength score" value={formatPercent(currency.strengthScore, 0)} help="Used in dashboard ranking and pair differential context." />
        <Stat label="Risk score" value={formatPercent(currency.riskScore, 0)} help="Higher scores widen uncertainty and elevate risk surfaces." />
        <Stat label="Policy rate" value={formatPercent(currency.macro.policyRate)} help={currency.centralBankState.summary} />
        <Stat label="Event sensitivity" value={formatPercent(currency.eventSensitivity, 0)} help="Higher scores raise event weighting across the app." />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Macro block" title="Current macro state" />
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Inflation" value={formatPercent(currency.macro.inflation)} />
            <Stat label="GDP growth" value={formatPercent(currency.macro.gdpGrowth)} />
            <Stat label="Unemployment" value={formatPercent(currency.macro.unemployment)} />
            <Stat label="Trade balance" value={formatNumber(currency.macro.tradeBalance)} />
            <Stat label="Debt / GDP" value={formatPercent(currency.macro.debtToGdp)} />
            <Stat label="Manufacturing" value={formatNumber(currency.macro.manufacturingTrend)} />
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="What moves this currency" title="Interpretation panel" />
          <div className="space-y-3">
            {currency.drivers.map((driver) => (
              <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4" key={driver.label}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{driver.label}</div>
                  <div className="text-sm text-[var(--muted)]">{formatPercent(driver.weight * 100, 0)}</div>
                </div>
                <div className="mt-2 text-sm text-[var(--muted)]">{driver.description}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionTitle eyebrow="Related pairs" title="Direct pair pathways" />
          <div className="grid gap-4 md:grid-cols-2">
            {pairs.map((pair) => (
              <PairCard key={pair.id} href={`/app/markets/${pair.id}`} meta={<div className="text-[var(--muted)]">Event risk {pair.eventRiskBase}</div>} pair={pair} subtitle={pair.narrative} />
            ))}
          </div>
        </div>
        <Panel>
          <SectionTitle eyebrow="Central bank" title={currency.centralBank} />
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4 text-sm leading-6 text-[var(--muted)]">{currency.centralBankState.expectation}</div>
            {currency.centralBankState.toneHistory.map((item) => (
              <div className="rounded-2xl border border-[var(--line)] px-4 py-3" key={item.label}>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-[var(--muted)]">{item.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle eyebrow="Events & news" title="Current context" />
          <div className="space-y-3">
            {events.slice(0, 3).map((event) => (
              <Link className="block rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={event.id} to={`/app/events/${event.id}`}>
                <div className="font-medium">{event.title}</div>
                <div className="mt-2 text-sm text-[var(--muted)]">{event.scenarioNarrative}</div>
              </Link>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {news.slice(0, 2).map((item) => (
              <NewsCard item={item} key={item.id} />
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Historical narrative" title="Macro story arc" />
            <div className="space-y-3">
              {currency.historicalNarrative.map((item) => (
                <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4" key={item.title}>
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{item.summary}</div>
                </div>
              ))}
            </div>
          </Panel>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </Page>
  )
}
