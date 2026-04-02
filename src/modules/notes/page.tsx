import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingPanel } from '../../components/ui/primitives'
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

const templateToneClass = (template: string) => {
  if (template.includes('event')) return 'text-[var(--warning)]'
  if (template.includes('simulation')) return 'text-[var(--accent)]'
  if (template.includes('risk')) return 'text-[var(--danger)]'
  return 'text-[var(--muted)]'
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
    <div className="space-y-6">
      <section className="bg-[color:var(--panel)] p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,10rem))]">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Analyst notebook</div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--text)]">Research Log</h1>
          </div>
          {[
            ['Notes', String(notes.length)],
            ['Pinned', String(pinnedNotes.length)],
            ['Links', String(linkedCount)],
            ['Updated', filteredNotes[0] ? formatDateTime(filteredNotes[0].updatedAt) : '-'],
          ].map(([label, value]) => (
            <div className="bg-[color:var(--panel-2)] px-4 py-3" key={label}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
              <div className="mt-2 text-xl font-bold text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 bg-[color:var(--panel)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 bg-[color:var(--panel-2)] p-1">
            {(['all', 'pinned', 'pair', 'currency', 'event', 'forecast', 'simulation', 'strategy'] as const).map((item) => (
              <button className={chipClass(scope === item)} key={item} onClick={() => setScope(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <input className="w-full max-w-sm border-none bg-[color:var(--panel-2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" value={query} />
        </div>

        {pinnedNotes.length ? (
          <div className="flex flex-wrap gap-2">
            {pinnedNotes.slice(0, 3).map((note) => (
              <button
                className="bg-[color:var(--panel-2)] px-3 py-2 text-[11px] font-medium text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
                key={note.id}
                onClick={() => setQuery(note.title)}
                type="button"
              >
                {note.title}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          {filteredNotes.map((note) => (
            <article className="bg-[color:var(--panel)] p-4" key={note.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{note.title}</h2>
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${templateToneClass(note.template)}`}>{note.template}</span>
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
                    className="bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text)] transition hover:bg-[color:var(--panel-3)]"
                    key={`${note.id}-${entity.entityType}-${entity.entityId}`}
                    to={appApi.getEntityHref(entity.entityType, entity.entityId)}
                  >
                    {labelForEntity(seed, entity.entityType, entity.entityId)}
                  </Link>
                ))}
                {note.tags.map((tag) => (
                  <span className="bg-[color:var(--panel-2)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]" key={`${note.id}-${tag}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="bg-[color:var(--panel)] p-4">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">New note entry</div>
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
        </aside>
      </div>
    </div>
  )
}
