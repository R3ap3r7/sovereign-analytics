import { Link } from 'react-router-dom'
import type { MacroEvent, NewsItem, Note, Pair } from '../../domain/types'
import { formatDateTime } from '../../lib/utils'
import { Badge, Panel } from '../ui/primitives'

export const PairCard = ({ pair, subtitle, meta, href }: { pair: Pair; subtitle: string; meta: React.ReactNode; href?: string }) => {
  const content = (
    <Panel className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{pair.classification}</div>
          <h3 className="mt-1 text-lg font-semibold">{pair.symbol}</h3>
        </div>
        <Badge tone={pair.eventRiskBase > 70 ? 'warning' : 'accent'}>{pair.eventRiskBase > 70 ? 'Event loaded' : 'Tradeable'}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
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
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{event.region}</div>
          <h3 className="mt-1 text-base font-semibold">{event.title}</h3>
        </div>
        <Badge tone={event.impact === 'high' ? 'danger' : event.impact === 'medium' ? 'warning' : 'default'}>{event.impact} impact</Badge>
      </div>
      <div className="mt-3 text-sm text-[var(--muted)]">{event.scenarioNarrative}</div>
      <div className="mt-4 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{formatDateTime(event.scheduledAt)}</div>
    </Panel>
  </Link>
)

export const NewsCard = ({ item }: { item: NewsItem }) => (
  <Panel>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{item.source}</div>
        <h3 className="mt-1 text-base font-semibold">{item.headline}</h3>
      </div>
      <Badge tone={item.sentiment === 'bullish' ? 'accent' : item.sentiment === 'bearish' ? 'danger' : 'default'}>{item.sentiment}</Badge>
    </div>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.whyItMatters}</p>
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
      {item.currencyCodes.map((code) => (
        <span key={code} className="rounded-full border border-[var(--line)] px-2 py-1">{code}</span>
      ))}
    </div>
  </Panel>
)

export const NoteCard = ({ note }: { note: Note }) => (
  <Panel>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{note.template}</div>
        <h3 className="mt-1 text-base font-semibold">{note.title}</h3>
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
