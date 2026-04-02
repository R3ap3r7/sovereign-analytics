import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, Stat } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { formatDateTime, formatNumber } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'

const toneForImpact = (impact: string) => {
  if (impact === 'high') return 'danger'
  if (impact === 'medium') return 'warning'
  return 'default'
}

const toneForSentiment = (sentiment: string) => {
  if (sentiment === 'bullish') return 'accent'
  if (sentiment === 'bearish') return 'danger'
  return 'default'
}

const CompactSection = ({ label, title, detail }: { label: string; title: string; detail?: string }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">{title}</h2>
    </div>
    {detail ? <div className="max-w-md text-right text-xs leading-5 text-[var(--muted)]">{detail}</div> : null}
  </div>
)

const MiniPill = ({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warning' | 'danger' }) => (
  <span
    className={[
      'inline-flex items-center rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
      tone === 'accent'
        ? 'border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.08)] text-[var(--accent)]'
        : tone === 'warning'
          ? 'border-[rgba(224,180,108,0.24)] bg-[rgba(224,180,108,0.08)] text-[var(--warning)]'
          : tone === 'danger'
            ? 'border-[rgba(227,128,120,0.24)] bg-[rgba(227,128,120,0.08)] text-[var(--danger)]'
            : 'border-[var(--line)] bg-white/[0.03] text-[var(--muted)]',
    ].join(' ')}
  >
    {children}
  </span>
)

export const EventsPage = () => {
  const { data, loading } = useAsyncResource(() => Promise.all([appApi.listEvents(), appApi.listNews()]).then(([events, news]) => ({ events, news })), [])
  const [impact, setImpact] = useState('all')
  const [currency, setCurrency] = useState('all')
  const [region] = useState('all')
  const [type, setType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const filteredEvents = useMemo(
    () =>
      !data
        ? []
        :
      data.events
        .filter((event) => (impact === 'all' ? true : event.impact === impact))
        .filter((event) => (currency === 'all' ? true : event.currencyCodes.includes(currency)))
        .filter((event) => (region === 'all' ? true : event.region === region))
        .filter((event) => (type === 'all' ? true : event.type === type))
        .filter((event) => (searchQuery ? `${event.title} ${event.region} ${event.type} ${event.currencyCodes.join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase()) : true)),
    [data, impact, currency, region, type, searchQuery],
  )
  const filteredNews = useMemo(
    () =>
      !data
        ? []
        : data.news
          .filter((item) => (currency === 'all' ? true : item.currencyCodes.includes(currency)))
          .filter((item) => (searchQuery ? `${item.headline} ${item.explanation} ${item.whyItMatters} ${item.currencyCodes.join(' ')} ${item.pairIds.join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase()) : true)),
    [data, currency, searchQuery],
  )

  useEffect(() => {
    if (!data) return
    if (!filteredEvents.length) {
      setSelectedEventId(null)
      return
    }
    if (!selectedEventId || !filteredEvents.some((item) => item.id === selectedEventId)) {
      setSelectedEventId(filteredEvents[0].id)
    }
  }, [data, filteredEvents, selectedEventId])

  if (loading || !data) return <LoadingPanel label="Loading news and events…" />

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null
  const topNarrative = [...filteredEvents]
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3)
  const sentimentSummary = filteredNews.reduce(
    (acc, item) => {
      acc[item.sentiment] += 1
      return acc
    },
    { bullish: 0, bearish: 0, neutral: 0 },
  )
  const priorityPairs = selectedEvent?.pairIds.slice(0, 3) ?? []
  const formatPairCode = (pairId: string) => pairId.replace('-', '/').toUpperCase()

  return (
      <div className="space-y-4">
        <nav className="flex flex-wrap items-center gap-1 bg-[color:var(--panel)] p-1">
          {[
            { label: 'All', onClick: () => { setImpact('all'); setType('all') }, active: impact === 'all' && type === 'all' },
            { label: 'High Impact', onClick: () => setImpact(impact === 'high' ? 'all' : 'high'), active: impact === 'high' },
            { label: 'Central Banks', onClick: () => setType(type === 'speech' || type === 'rate decision' ? 'all' : 'speech'), active: type === 'speech' || type === 'rate decision' },
            { label: 'Economic Data', onClick: () => setType(type === 'CPI' ? 'all' : 'CPI'), active: type === 'CPI' },
            { label: 'Geopolitics', onClick: () => setType(type === 'geopolitical incident' ? 'all' : 'geopolitical incident'), active: type === 'geopolitical incident' },
          ].map((item) => (
            <button
              key={item.label}
              className={item.active ? 'px-4 py-1.5 text-xs font-semibold bg-[color:var(--panel-3)] text-[var(--accent)] transition-colors' : 'px-4 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <div className="ml-auto flex items-center px-3 gap-2 bg-[color:var(--panel-4)] border-b border-[color:rgba(141,164,179,0.2)] w-full sm:w-64">
            <span className="text-sm text-[var(--muted)]">⌕</span>
            <input className="bg-transparent border-none text-xs w-full focus:ring-0 placeholder:text-[var(--muted)] py-1.5 outline-none" placeholder="Search terminal..." type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
        </nav>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <section className="relative overflow-hidden flex bg-[color:var(--panel)] min-h-72">
            <div className="flex-1 p-6 flex flex-col justify-between relative z-10 bg-gradient-to-r from-[color:var(--panel)] via-[color:var(--panel)] to-transparent">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEvent ? <Badge tone={toneForImpact(selectedEvent.impact)}>{selectedEvent.impact}</Badge> : null}
                  <MiniPill tone="warning">{filteredEvents.filter((event) => event.impact === 'high').length} high impact</MiniPill>
                  <MiniPill>{filteredNews.length} stories</MiniPill>
                </div>
                <h2 className="max-w-4xl font-display text-[2.25rem] font-semibold leading-none tracking-[-0.05em] text-[var(--text)]">
                  {selectedEvent?.title ?? 'Macro terminal'}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  {selectedEvent?.scenarioNarrative ?? 'No event selected.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent?.currencyCodes.map((code) => (
                    <MiniPill key={code}>{code}</MiniPill>
                  ))}
                  {priorityPairs.map((pairId) => (
                    <MiniPill key={pairId} tone="accent">{formatPairCode(pairId)}</MiniPill>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-[0.12em] text-[var(--muted)]">Event urgency</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-display font-bold text-[var(--warning)]">{selectedEvent ? formatNumber(selectedEvent.urgency, 0) : '0'}</span>
                    <span className="text-xs text-[var(--muted)]">{selectedEvent ? formatDateTime(selectedEvent.scheduledAt) : 'No time'}</span>
                  </div>
                </div>
                <div className="flex h-12 items-end gap-1">
                  {Array.from({ length: 8 }, (_, index) => {
                    const level = selectedEvent ? Math.max(16, Math.min(100, (selectedEvent.urgency / 100) * 100 - index * 6)) : 16
                    return <div className="w-2 bg-[rgba(227,128,120,0.18)]" key={index} style={{ height: `${level}%` }} />
                  })}
                </div>
              </div>
            </div>

            <div className="hidden w-[28%] bg-[linear-gradient(180deg,rgba(31,163,138,0.08),transparent)] xl:block">
              <div className="flex h-full flex-col justify-end p-6">
                <div className="grid gap-2">
                  <div className="bg-[color:var(--panel-2)] px-4 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Region</div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text)]">{selectedEvent?.region ?? 'Global'}</div>
                  </div>
                  <div className="bg-[color:var(--panel-2)] px-4 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Forecast / Prior</div>
                    <div className="mt-2 text-sm font-semibold text-[var(--text)]">{selectedEvent ? `${selectedEvent.forecast} / ${selectedEvent.prior}` : 'n/a'}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-1 flex flex-col gap-1">
            <div className="px-3 py-2 flex justify-between items-center border-b border-[color:rgba(141,164,179,0.08)]">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--accent)] rounded-full" /> Live News Stream
              </h3>
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-[0.12em]">Auto refresh enabled</span>
            </div>
            <div className="space-y-1">
              {filteredNews.slice(0, 6).map((item) => (
                <div className="flex gap-4 p-3 transition-colors items-start border-l-2 hover:bg-[color:var(--panel-2)]" key={item.id} style={{ borderLeftColor: item.sentiment === 'bullish' ? 'var(--accent)' : item.sentiment === 'bearish' ? 'var(--danger)' : 'rgba(141,164,179,0.16)' }}>
                  <span className="text-[10px] font-mono text-[var(--muted)] w-12 pt-0.5">{formatDateTime(item.timestamp)}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text)]">{item.headline}</span>
                      <span className="px-1.5 py-0.5 bg-[color:var(--panel-3)] text-[var(--muted)] text-[9px] font-bold uppercase">{item.source}</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">{item.explanation}</p>
                    <p className="text-[11px] text-[var(--text)] leading-relaxed">{item.whyItMatters}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={item.sentiment === 'bullish' ? 'text-[10px] font-bold text-[var(--accent)] uppercase' : item.sentiment === 'bearish' ? 'text-[10px] font-bold text-[var(--danger)] uppercase' : 'text-[10px] font-bold text-[var(--muted)] uppercase'}>
                      {item.sentiment}
                    </span>
                    <span className="text-[9px] text-[var(--muted)]">{item.pairIds.slice(0, 2).map(formatPairCode).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:rgba(141,164,179,0.08)] px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text)]">Economic Calendar</h3>
              <div className="flex items-center gap-2">
                <select className="border-none bg-[color:var(--panel-4)] px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text)] outline-none" value={impact} onChange={(event) => setImpact(event.target.value)}>
                  <option value="all">All impact</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select className="border-none bg-[color:var(--panel-4)] px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text)] outline-none" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="all">All currencies</option>
                  {['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD', 'INR', 'CNY'].map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[color:var(--panel-2)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Curr.</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Region</th>
                    <th className="px-4 py-3 text-left">Impact</th>
                    <th className="px-4 py-3 text-right">Actual</th>
                    <th className="px-4 py-3 text-right">Forecast</th>
                    <th className="px-4 py-3 text-right">Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                    const active = event.id === selectedEvent?.id
                    return (
                      <tr
                        className={[
                          'cursor-pointer border-t border-[var(--line)] transition-colors',
                          active ? 'bg-[color:var(--panel-3)]' : 'bg-[color:var(--panel-2)]/70 hover:bg-[color:var(--panel-3)]',
                        ].join(' ')}
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                      >
                        <td className="px-4 py-4 align-top text-xs text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {event.currencyCodes.slice(0, 3).map((code) => (
                              <span key={code} className="rounded-[2px] border border-[var(--line)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                {code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-[var(--text)]">{event.title}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-[var(--muted)]">{event.region}</td>
                        <td className="px-4 py-4 align-top">
                          <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top text-right text-xs font-semibold text-[var(--text)]">{event.actual ?? '--'}</td>
                        <td className="px-4 py-4 align-top text-right text-xs text-[var(--muted)]">{event.forecast}</td>
                        <td className="px-4 py-4 align-top text-right text-xs text-[var(--muted)]">{event.prior}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-[color:var(--panel)] p-4">
            <CompactSection label="Inspector" title={selectedEvent ? selectedEvent.title : 'Event'} detail={selectedEvent ? selectedEvent.scenarioNarrative : undefined} />
            {selectedEvent ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Stat label="Region" value={selectedEvent.region} />
                  <Stat label="Time" value={formatDateTime(selectedEvent.scheduledAt)} />
                  <Stat label="Impact" value={selectedEvent.impact} />
                  <Stat label="Urgency" value={formatNumber(selectedEvent.urgency, 0)} />
                </div>
                <div className="mt-4 space-y-2 border-t border-[color:rgba(141,164,179,0.08)] pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Scenarios</div>
                  <div className="border border-[rgba(105,211,192,0.22)] bg-[rgba(105,211,192,0.08)] px-4 py-3 text-sm text-[var(--text)]">Stronger-than-expected: supports the local currency and intensifies repricing across linked pairs.</div>
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--text)]">In-line print: keeps the current market story intact and shifts focus back to the next catalyst.</div>
                  <div className="border border-[rgba(227,128,120,0.22)] bg-[rgba(227,128,120,0.08)] px-4 py-3 text-sm text-[var(--text)]">Softer-than-expected: pressures the currency and opens reversal risk in crowded trend trades.</div>
                </div>
                <div className="mt-4 space-y-2 border-t border-[color:rgba(141,164,179,0.08)] pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Linked market</div>
                  {selectedEvent.pairIds.length ? (
                    selectedEvent.pairIds.slice(0, 3).map((pairId) => (
                      <Link className="flex items-center justify-between bg-[color:var(--panel-2)] px-3 py-2.5 transition hover:bg-[color:var(--panel-3)]" key={pairId} to={`/app/markets/${pairId}`}>
                        <span className="text-sm font-medium text-[var(--text)]">{formatPairCode(pairId)}</span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Open</span>
                      </Link>
                    ))
                  ) : (
                    <div className="bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--muted)]">No linked pairs.</div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedEvent.currencyCodes.map((code) => (
                      <Link key={code} to={`/app/currencies/${code}`}>
                        <MiniPill tone="default">{code}</MiniPill>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 text-sm text-[var(--muted)]">No event selected.</div>
            )}
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <CompactSection label="Priority queue" title="Top urgency" />
            <div className="mt-4 space-y-3">
              {topNarrative.map((event) => (
                <button
                  className={[
                    'w-full border border-[var(--line)] px-4 py-3 text-left transition-colors',
                    event.id === selectedEvent?.id ? 'bg-[color:var(--panel-3)]' : 'bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-3)]',
                  ].join(' ')}
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[var(--text)]">{event.title}</div>
                    <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[color:var(--panel)] p-4">
            <CompactSection label="Sentiment" title="Terminal balance" />
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-4 py-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Bullish</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{sentimentSummary.bullish}</span>
              </div>
              <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-4 py-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Neutral</span>
                <span className="text-sm font-semibold text-[var(--text)]">{sentimentSummary.neutral}</span>
              </div>
              <div className="flex items-center justify-between bg-[color:var(--panel-2)] px-4 py-3">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Bearish</span>
                <span className="text-sm font-semibold text-[var(--danger)]">{sentimentSummary.bearish}</span>
              </div>
            </div>
          </section>

          {priorityPairs.length ? (
            <section className="bg-[color:var(--panel)] p-4">
              <CompactSection label="Linked" title="Priority pairs" />
              <div className="mt-4 flex flex-wrap gap-2">
                {priorityPairs.map((pairId) => (
                  <Link className="bg-[color:var(--panel-2)] px-3 py-2 text-[11px] font-medium text-[var(--text)] transition hover:bg-[color:var(--panel-3)]" key={pairId} to={`/app/markets/${pairId}`}>
                    {formatPairCode(pairId)}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      </div>
  )
}

export const EventDetailPage = () => {
  const { setActiveSimulation } = useAppState()
  const navigate = useNavigate()
  const params = useParams()
  const { data, loading } = useAsyncResource(() => appApi.getEventWorkspace(params.eventId ?? ''), [params.eventId])
  useEffect(() => {
    if (params.eventId) appApi.saveVisited('events', params.eventId)
  }, [params.eventId])

  if (loading || !data) return <LoadingPanel label="Loading event inspector…" />

  const scenarioPairs = data.pairs.slice(0, 4)

  return (
    <Page title={data.event.title}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <Panel className="overflow-hidden p-0">
            <div className="grid gap-px bg-[var(--line)] xl:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-[color:var(--panel-2)] px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={toneForImpact(data.event.impact)}>{data.event.impact}</Badge>
                  <Badge tone={data.event.status === 'upcoming' ? 'warning' : 'accent'}>{data.event.status}</Badge>
                  <Badge tone="default">{data.event.type}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                  <Stat label="Region" value={data.event.region} />
                  <Stat label="Timing" value={formatDateTime(data.event.scheduledAt)} />
                  <Stat label="Urgency" value={formatNumber(data.event.urgency, 0)} />
                  <Stat label="Prior" value={data.event.prior} />
                  <Stat label="Forecast" value={data.event.forecast} />
                </div>
                <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {data.event.actual ? `Actual ${data.event.actual}` : 'Actual pending'}
                </div>
                {data.pairs[0] ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:text-[var(--accent)]" to={`/app/markets/${data.pairs[0].id}`}>
                      Open {data.pairs[0].symbol}
                    </Link>
                    <button
                      className="inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.42)] hover:text-[var(--accent)]"
                      onClick={() => {
                        setActiveSimulation(appApi.buildSimulationFromPair(data.pairs[0].id))
                        navigate(`/app/simulation?pair=${data.pairs[0].id}`)
                      }}
                      type="button"
                    >
                      Sim {data.pairs[0].symbol}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="space-y-px bg-[var(--line)]">
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Event line</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text)]">{data.event.scenarioNarrative}</div>
                </div>
                <div className="bg-[color:var(--panel)] px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Impact set</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.event.currencyCodes.slice(0, 5).map((code) => (
                      <MiniPill key={code}>{code}</MiniPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel>
              <CompactSection label="Scenarios" title="Directional outcomes" detail="Short-horizon market responses." />
              <div className="mt-4 space-y-3">
                <div className="border border-[rgba(105,211,192,0.22)] bg-[rgba(105,211,192,0.08)] px-4 py-3 text-sm text-[var(--text)]">
                  Stronger print: supports the local currency and sharpens repricing.
                </div>
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--text)]">
                  In-line print: keeps the current market story intact.
                </div>
                <div className="border border-[rgba(227,128,120,0.22)] bg-[rgba(227,128,120,0.08)] px-4 py-3 text-sm text-[var(--text)]">
                  Softer print: pressures the currency and opens reversal risk in linked pairs.
                </div>
              </div>
            </Panel>

            <Panel>
              <CompactSection label="Actions" title="Quick launch" />
              <div className="mt-4 space-y-2">
                {scenarioPairs.length ? (
                  scenarioPairs.map((pair) => (
                    <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={pair.id}>
                      <div>
                        <div className="font-medium text-[var(--text)]">{pair.symbol}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{pair.narrative}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/markets/${pair.id}`}>
                          Open
                        </Link>
                        <button
                          className="text-[var(--accent)] transition hover:text-[var(--text)]"
                          onClick={() => {
                            setActiveSimulation(appApi.buildSimulationFromPair(pair.id))
                            navigate(`/app/simulation?pair=${pair.id}`)
                          }}
                          type="button"
                        >
                          Sim
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm text-[var(--muted)]">No linked pairs.</div>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <CompactSection label="Currencies" title="Macro linkage" />
              <div className="mt-4 grid gap-2">
                {data.currencies.map((currency) => (
                  <Link className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 transition hover:bg-[color:var(--panel-3)]" key={currency.code} to={`/app/currencies/${currency.code}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text)]">{currency.code}</div>
                      <Badge tone="default">{currency.centralBank}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Stat label="Strength" value={formatNumber(currency.strengthScore, 0)} />
                      <Stat label="Risk" value={formatNumber(currency.riskScore, 0)} />
                      <Stat label="Sensitivity" value={formatNumber(currency.eventSensitivity, 0)} />
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <CompactSection label="Comparable" title="Related events" />
              <div className="mt-4 space-y-2">
                {data.comparableEvents.map((event) => (
                  <Link className="block border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 transition hover:bg-[color:var(--panel-3)]" key={event.id} to={`/app/events/${event.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text)]">{event.title}</div>
                      <Badge tone={toneForImpact(event.impact)}>{event.impact}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted)]">{event.region} · {formatDateTime(event.scheduledAt)}</div>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <CompactSection label="Inspector" title="Event detail" />
            <div className="mt-4 space-y-3">
              <Stat label="Status" value={data.event.status} />
              <Stat label="Impact" value={data.event.impact} />
              <Stat label="Urgency" value={formatNumber(data.event.urgency, 0)} />
            </div>
          </Panel>

          <Panel>
            <CompactSection label="Pairs" title="Linked pairs" />
            <div className="mt-4 space-y-2">
              {data.pairs.map((pair) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={pair.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[var(--text)]">{pair.symbol}</div>
                    <MiniPill tone={toneForImpact(data.event.impact)}>{pair.classification}</MiniPill>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">{pair.narrative}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="text-[var(--accent)] transition hover:text-[var(--text)]" to={`/app/markets/${pair.id}`}>
                      Open
                    </Link>
                    <button
                      className="text-[var(--accent)] transition hover:text-[var(--text)]"
                      onClick={() => {
                        setActiveSimulation(appApi.buildSimulationFromPair(pair.id))
                        navigate(`/app/simulation?pair=${pair.id}`)
                      }}
                      type="button"
                    >
                      Sim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <CompactSection label="News" title="Related coverage" />
            <div className="mt-4 space-y-2">
              {data.relatedNews.map((item) => (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--text)]">{item.headline}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{item.source}</div>
                    </div>
                    <Badge tone={toneForSentiment(item.sentiment)}>{item.sentiment}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
