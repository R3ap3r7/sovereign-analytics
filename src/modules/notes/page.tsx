import { BookText, Link2, Pin, Search, SquarePen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { useAppState } from '../../app/AppState'
import { appApi, getSeed } from '../../domain/services/api'
import { buildEntityLabel } from '../../domain/selectors'
import type { EntityType, Note } from '../../domain/types'
import { formatDateTime } from '../../lib/utils'
import { useAsyncResource } from '../../lib/useAsyncResource'

const fieldClass = 'w-full border-none bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none'
const chipClass = (active: boolean) =>
  active
    ? 'px-3 py-2 text-[11px] font-semibold text-[var(--accent)] bg-[color:var(--panel-3)]'
    : 'px-3 py-2 text-[11px] font-medium text-[var(--muted)] bg-[color:var(--panel)] transition hover:bg-[color:var(--panel-2)] hover:text-[var(--text)]'

const templateBadgeTone = (template: string) => {
  if (template.includes('event')) return 'warning'
  if (template.includes('simulation')) return 'accent'
  if (template.includes('risk')) return 'danger'
  return 'default'
}

const labelForEntity = (seed: ReturnType<typeof getSeed>, entityType: EntityType, entityId: string) => {
  if (entityType === 'simulation') {
    const simulation = seed.simulations.find((item) => item.id === entityId)
    return simulation ? `${simulation.pairId.toUpperCase()} · ${simulation.scenarioType}` : entityId
  }
  if (entityType === 'strategy') return seed.strategies.find((item) => item.id === entityId)?.name ?? entityId
  return buildEntityLabel(seed, entityType, entityId)
}

export const NotesPage = () => {
  const { user } = useAppState()
  const { data, loading, setData } = useAsyncResource(() => appApi.listNotes(), [user?.id])
  const seed = getSeed()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [template, setTemplate] = useState('pair thesis')
  const [tags, setTags] = useState('manual')
  const [entityType, setEntityType] = useState<EntityType>('pair')
  const [entityId, setEntityId] = useState('eur-usd')
  const [scope, setScope] = useState<'all' | 'pinned' | EntityType>('all')
  const [query, setQuery] = useState('')

  const entityOptions = useMemo(
    () =>
      ({
        pair: seed.pairs.map((item) => ({ value: item.id, label: item.symbol })),
        currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` })),
        event: seed.events.map((item) => ({ value: item.id, label: item.title })),
        forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
        simulation: seed.simulations.filter((item) => item.userId === user?.id).map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} · ${item.scenarioType}` })),
        strategy: seed.strategies.map((item) => ({ value: item.id, label: item.name })),
      }) satisfies Record<EntityType, Array<{ value: string; label: string }>>,
    [seed, user?.id],
  )

  const notes = data ?? []
  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...notes]
      .filter((note) => (scope === 'all' ? true : scope === 'pinned' ? note.pinned : note.linkedEntities.some((entity) => entity.entityType === scope)))
      .filter((note) =>
        term
          ? [note.title, note.body, note.template, note.tags.join(' '), note.linkedEntities.map((entity) => entity.entityId).join(' ')]
              .join(' ')
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }, [notes, query, scope])

  if (loading || !data) return <LoadingPanel label="Loading notes…" />

  const pinnedNotes = filteredNotes.filter((note) => note.pinned)
  const linkedCount = new Set(notes.flatMap((note) => note.linkedEntities.map((entity) => `${entity.entityType}:${entity.entityId}`))).size

  return (
    <Page
      actions={
        <>
          <Badge tone="default">{notes.length} notes</Badge>
          <Badge tone="accent">{pinnedNotes.length} pinned</Badge>
        </>
      }
      description="Capture thesis notes, event prep, and review logs, then keep them attached to the entities that matter."
      title="Research Log"
    >
      <Panel className="p-0">
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Notes', String(notes.length), <BookText className="size-4" />],
            ['Pinned', String(pinnedNotes.length), <Pin className="size-4" />],
            ['Links', String(linkedCount), <Link2 className="size-4" />],
            ['Updated', filteredNotes[0] ? formatDateTime(filteredNotes[0].updatedAt) : '-', <SquarePen className="size-4" />],
          ].map(([label, value, icon]) => (
            <div className="bg-[color:var(--panel-2)] px-4 py-4" key={label as string}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label as string}</div>
                <div className="text-[var(--accent)]">{icon}</div>
              </div>
              <div className="mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.05em] text-[var(--text)]">{value as string}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle eyebrow="Filter" title="Browse notes" detail="Filter by linked entity or search across title, body, tags, and linked references." />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 bg-[color:var(--panel-2)] p-1">
            {(['all', 'pinned', 'pair', 'currency', 'event', 'forecast', 'simulation', 'strategy'] as const).map((item) => (
              <button className={chipClass(scope === item)} key={item} onClick={() => setScope(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3">
            <Search className="size-4 text-[var(--muted)]" />
            <input className="w-full border-none bg-transparent px-0 py-2.5 text-sm text-[var(--text)] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" value={query} />
          </div>
        </div>
        {pinnedNotes.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {pinnedNotes.slice(0, 3).map((note) => (
              <button
                className="rounded-[3px] border border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.08)] px-3 py-2 text-[11px] font-medium text-[var(--text)] transition hover:bg-[rgba(105,211,192,0.12)]"
                key={note.id}
                onClick={() => setQuery(note.title)}
                type="button"
              >
                {note.title}
              </button>
            ))}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4">
          {filteredNotes.map((note) => (
            <Panel key={note.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{note.title}</h2>
                    <Badge tone={templateBadgeTone(note.template)}>{note.template}</Badge>
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(note.updatedAt)}</div>
                </div>
                <button
                  className={note.pinned ? 'text-[11px] font-semibold text-[var(--accent)]' : 'text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]'}
                  onClick={() =>
                    void appApi.pinNote(note.id, !note.pinned).then(async () => {
                      const refreshed = await appApi.listNotes()
                      setData(refreshed)
                    })
                  }
                  type="button"
                >
                  {note.pinned ? 'Pinned' : 'Pin'}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{note.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {note.linkedEntities.map((entity) => (
                  <Link
                    className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)] transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]"
                    key={`${note.id}-${entity.entityType}-${entity.entityId}`}
                    to={appApi.getEntityHref(entity.entityType, entity.entityId)}
                  >
                    {labelForEntity(seed, entity.entityType, entity.entityId)}
                  </Link>
                ))}
                {note.tags.map((tag) => (
                  <span className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]" key={`${note.id}-${tag}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
          {!filteredNotes.length ? (
            <Panel>
              <div className="text-sm text-[var(--muted)]">No notes match the current search or filter.</div>
            </Panel>
          ) : null}
        </section>

        <aside className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Compose" title="New note entry" detail="Attach the note to a pair, event, forecast, strategy, or saved run." />
            <div className="space-y-3">
            <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
            <textarea className="min-h-40 w-full border-none bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none" onChange={(event) => setBody(event.target.value)} placeholder="Body" value={body} />
            <select className={fieldClass} onChange={(event) => setTemplate(event.target.value)} value={template}>
              <option value="pair thesis">Pair thesis</option>
              <option value="event prep">Event prep</option>
              <option value="post-simulation review">Post-simulation review</option>
              <option value="weekly macro summary">Weekly macro summary</option>
              <option value="risk observation">Risk observation</option>
            </select>
            <input className={fieldClass} onChange={(event) => setTags(event.target.value)} placeholder="macro, usd, cpi" value={tags} />
            <select
              className={fieldClass}
              onChange={(event) => {
                const next = event.target.value as EntityType
                setEntityType(next)
                setEntityId(entityOptions[next][0]?.value ?? '')
              }}
              value={entityType}
            >
              <option value="pair">Pair</option>
              <option value="currency">Currency</option>
              <option value="event">Event</option>
              <option value="forecast">Forecast</option>
              <option value="simulation">Simulation</option>
              <option value="strategy">Strategy</option>
            </select>
            <select className={fieldClass} onChange={(event) => setEntityId(event.target.value)} value={entityId}>
              {entityOptions[entityType].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="w-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--bg)]"
              onClick={async () => {
                if (!user || !title || !body || !entityId) return
                const note: Note = {
                  id: `note-${Date.now()}`,
                  userId: user.id,
                  title,
                  body,
                  tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
                  template,
                  pinned: false,
                  linkedEntities: [{ entityType, entityId }],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                await appApi.createNote(note)
                const refreshed = await appApi.listNotes()
                setData(refreshed)
                setTitle('')
                setBody('')
                setTags('manual')
              }}
              type="button"
            >
              Save to notebook
            </button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Pinned" title="Quick access" />
            <div className="space-y-2">
              {pinnedNotes.length ? (
                pinnedNotes.slice(0, 4).map((note) => (
                  <button
                    className="flex w-full items-start justify-between rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-left transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]"
                    key={note.id}
                    onClick={() => setQuery(note.title)}
                    type="button"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--text)]">{note.title}</div>
                      <div className="mt-1 text-[11px] text-[var(--muted)]">{formatDateTime(note.updatedAt)}</div>
                    </div>
                    <Pin className="size-4 text-[var(--accent)]" />
                  </button>
                ))
              ) : (
                <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-3 text-sm text-[var(--muted)]">No pinned notes.</div>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
