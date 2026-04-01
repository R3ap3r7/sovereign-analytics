import { Link } from 'react-router-dom'
import type { MacroEvent, NewsItem, Note, Pair } from '../../domain/types'
import { formatDateTime } from '../../lib/utils'
import { Badge, Panel } from '../ui/primitives'

export const PairCard = ({ pair, subtitle, meta, href }: { pair: Pair; subtitle: string; meta: React.ReactNode; href?: string }) => {
  const content = (
    <Panel className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{pair.classification}</div>
          <h3 className="font-display mt-2 text-xl font-semibold tracking-[-0.02em]">{pair.symbol}</h3>
        </div>
        <Badge tone={pair.eventRiskBase > 70 ? 'warning' : 'accent'}>{pair.eventRiskBase > 70 ? 'Event loaded' : 'Tradeable'}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Carry</div>
          <div className="mt-1 text-sm">{pair.carryScore}</div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Sentiment</div>
          <div className="mt-1 text-sm">{pair.sentimentScore}</div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-4)] px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Risk</div>
          <div className="mt-1 text-sm">{pair.eventRiskBase}</div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
      <div className="mt-4 text-sm">{meta}</div>
    </Panel>
  )
  return href ? <Link to={href}>{content}</Link> : content
}

export const EventCard = ({ event }: { event: MacroEvent }) => (
  <Link className="block" to={`/app/events/${event.id}`}>
    <Panel className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{event.region}</div>
          <h3 className="font-display mt-2 text-lg font-semibold tracking-[-0.02em]">{event.title}</h3>
        </div>
        <Badge tone={event.impact === 'high' ? 'danger' : event.impact === 'medium' ? 'warning' : 'default'}>{event.impact} impact</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {event.currencyCodes.map((code) => (
          <span key={code} className="font-mono rounded-full border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{code}</span>
        ))}
      </div>
      <div className="mt-3 text-sm text-[var(--muted)]">{event.scenarioNarrative}</div>
      <div className="font-mono mt-4 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</div>
    </Panel>
  </Link>
)

export const NewsCard = ({ item }: { item: NewsItem }) => (
  <Panel>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{item.source}</div>
        <h3 className="font-display mt-2 text-lg font-semibold tracking-[-0.02em]">{item.headline}</h3>
      </div>
      <Badge tone={item.sentiment === 'bullish' ? 'accent' : item.sentiment === 'bearish' ? 'danger' : 'default'}>{item.sentiment}</Badge>
    </div>
    <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[var(--accent-2)]">Why it matters</div>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.whyItMatters}</p>
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
      {item.currencyCodes.map((code) => (
        <span key={code} className="font-mono rounded-full border border-[var(--line)] px-2 py-1 uppercase tracking-[0.14em]">{code}</span>
      ))}
    </div>
  </Panel>
)

export const NoteCard = ({ note }: { note: Note }) => (
  <Panel>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{note.template}</div>
        <h3 className="font-display mt-2 text-lg font-semibold tracking-[-0.02em]">{note.title}</h3>
      </div>
      {note.pinned ? <Badge tone="accent">Pinned</Badge> : null}
    </div>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{note.body}</p>
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      {note.tags.map((tag) => (
        <span key={tag} className="rounded-full border border-[var(--line)] px-2 py-1 text-[var(--muted)]">{tag}</span>
      ))}
    </div>
  </Panel>
)
