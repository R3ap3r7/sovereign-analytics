import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, LoadingPanel, Page, Panel, SectionTitle, Stat } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { buildEntityLabel } from '../../domain/selectors'
import type { EntityType, Note } from '../../domain/types'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { formatDateTime } from '../../lib/utils'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

const fieldClass =
  'w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]'

const actionClass =
  'inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.45)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'

const templateTone = (template: string) => {
  if (template.includes('event')) return 'warning'
  if (template.includes('simulation')) return 'accent'
  if (template.includes('risk')) return 'danger'
  return 'default'
}

const labelForEntity = (seed: ReturnType<typeof getSeed>, entityType: EntityType, entityId: string) => {
  if (entityType === 'simulation') {
    const simulation = seed.simulations.find((item) => item.id === entityId)
    return simulation ? `${simulation.pairId.toUpperCase()} | ${simulation.scenarioType}` : entityId
  }
  if (entityType === 'strategy') {
    return seed.strategies.find((item) => item.id === entityId)?.name ?? entityId
  }
  return buildEntityLabel(seed, entityType, entityId)
}

const labelHref = (entityType: EntityType, entityId: string) => appApi.getEntityHref(entityType, entityId)

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
        currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} | ${item.name}` })),
        event: seed.events.map((item) => ({ value: item.id, label: item.title })),
        forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
        simulation: seed.simulations.filter((item) => item.userId === user?.id).map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} | ${item.scenarioType}` })),
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

  const pinnedNotes = filteredNotes.filter((note) => note.pinned)
  const linkedCount = new Set(notes.flatMap((note) => note.linkedEntities.map((entity) => `${entity.entityType}:${entity.entityId}`))).size
  const templateCount = new Set(notes.map((note) => note.template)).size
  const updatedLabel = filteredNotes[0] ? formatDateTime(filteredNotes[0].updatedAt) : '-'

  if (loading || !data) return <LoadingPanel label="Loading notes…" />

  return (
    <Page title="Notes" description="Linked research logs.">
      <Panel className="overflow-hidden p-0">
        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-[color:var(--panel-2)] px-5 py-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Research root</div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="font-display text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text)]">Notebook</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Pairs | currencies | events | simulations | strategies</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="default">Notes {notes.length}</Badge>
              <Badge tone={pinnedNotes.length ? 'accent' : 'default'}>Pinned {pinnedNotes.length}</Badge>
              <Badge tone="warning">Links {linkedCount}</Badge>
              <Badge tone="default">Templates {templateCount}</Badge>
            </div>
          </div>
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
            <Stat label="Updated" value={updatedLabel} help="Most recent visible note." />
            <Stat label="Focus" value={scope === 'all' ? 'All' : scope === 'pinned' ? 'Pinned' : scope.toUpperCase()} help="Current filter scope." />
            <Stat label="Library" value={query ? 'Filtered' : 'Open'} help="Search state." />
            <Stat label="Persona" value={user?.displayName ?? 'Demo'} help="Current account." />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle eyebrow="Composer" title="New log" detail="Attach the note to an entity before saving." />
          <div className="space-y-3">
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Title</div>
              <input className={fieldClass} placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="block">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Body</div>
              <textarea className="min-h-40 w-full border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition hover:bg-[color:var(--panel-3)] focus:border-[rgba(105,211,192,0.45)]" placeholder="Body" value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Template</div>
                <select className={fieldClass} value={template} onChange={(event) => setTemplate(event.target.value)}>
                  <option value="pair thesis">Pair thesis</option>
                  <option value="event prep">Event prep</option>
                  <option value="post-simulation review">Post-simulation review</option>
                  <option value="weekly macro summary">Weekly macro summary</option>
                  <option value="risk observation">Risk observation</option>
                </select>
              </label>
              <label className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Tags</div>
                <input className={fieldClass} placeholder="macro, usd, cpi" value={tags} onChange={(event) => setTags(event.target.value)} />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Entity type</div>
                <select
                  className={fieldClass}
                  value={entityType}
                  onChange={(event) => {
                    const next = event.target.value as EntityType
                    setEntityType(next)
                    setEntityId(entityOptions[next][0]?.value ?? '')
                  }}
                >
                  <option value="pair">Pair</option>
                  <option value="currency">Currency</option>
                  <option value="event">Event</option>
                  <option value="forecast">Forecast</option>
                  <option value="simulation">Simulation</option>
                  <option value="strategy">Strategy</option>
                </select>
              </label>
              <label className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Entity</div>
                <select className={fieldClass} value={entityId} onChange={(event) => setEntityId(event.target.value)}>
                  {entityOptions[entityType].map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['pair', 'currency', 'event', 'forecast', 'simulation', 'strategy'] as const).map((item) => (
                <button
                  className={[
                    'inline-flex items-center rounded-[2px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition',
                    entityType === item
                      ? 'border-[var(--accent)] bg-[rgba(105,211,192,0.08)] text-[var(--accent)]'
                      : 'border-[var(--line)] bg-[color:var(--panel)] text-[var(--text)] hover:border-[rgba(105,211,192,0.45)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]',
                  ].join(' ')}
                  key={item}
                  onClick={() => {
                    setEntityType(item)
                    setEntityId(entityOptions[item][0]?.value ?? '')
                  }}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <PrimaryButton
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
                setData([note, ...notes])
                setTitle('')
                setBody('')
                setTags('manual')
              }}
              type="button"
            >
              Save note
            </PrimaryButton>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle eyebrow="Pinned" title="Active context" detail="Pinned notes stay at the top of the workspace." />
            <div className="space-y-2">
              {pinnedNotes.length ? (
                pinnedNotes.slice(0, 4).map((note) => (
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]" key={note.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{note.template}</div>
                        <div className="mt-1 font-display text-[1.05rem] font-semibold tracking-[-0.03em]">{note.title}</div>
                      </div>
                      <Badge tone="accent">Pinned</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.linkedEntities.map((entity) => (
                        <Link className={actionClass} key={`${note.id}-${entity.entityType}-${entity.entityId}`} to={labelHref(entity.entityType, entity.entityId)}>
                          {labelForEntity(seed, entity.entityType, entity.entityId)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-6 text-sm text-[var(--muted)]">No pinned notes.</div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle eyebrow="Library" title="Research log" />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={fieldClass} placeholder="Search notes" value={query} onChange={(event) => setQuery(event.target.value)} />
                <select className={fieldClass} value={scope} onChange={(event) => setScope(event.target.value as 'all' | 'pinned' | EntityType)}>
                  <option value="all">All</option>
                  <option value="pinned">Pinned</option>
                  <option value="pair">Pair</option>
                  <option value="currency">Currency</option>
                  <option value="event">Event</option>
                  <option value="forecast">Forecast</option>
                  <option value="simulation">Simulation</option>
                  <option value="strategy">Strategy</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {filteredNotes.length ? (
                filteredNotes.map((note) => (
                  <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-4 transition hover:border-[rgba(105,211,192,0.35)] hover:bg-[color:var(--panel-3)]" key={note.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-display text-[1.05rem] font-semibold tracking-[-0.03em]">{note.title}</div>
                          <Badge tone={templateTone(note.template)}>{note.template}</Badge>
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{formatDateTime(note.updatedAt)}</div>
                      </div>
                      <button
                        className={actionClass}
                        onClick={() => void appApi.pinNote(note.id, !note.pinned).then((updated) => setData(notes.map((item) => (item.id === note.id ? updated : item))))}
                        type="button"
                      >
                        {note.pinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{note.body}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.tags.map((tag) => (
                        <Badge key={`${note.id}-${tag}`} tone="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.linkedEntities.map((entity) => (
                        <Link className={actionClass} key={`${note.id}-${entity.entityType}-${entity.entityId}`} to={labelHref(entity.entityType, entity.entityId)}>
                          {labelForEntity(seed, entity.entityType, entity.entityId)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-6 text-sm text-[var(--muted)]">No notes match this filter.</div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  )
}
