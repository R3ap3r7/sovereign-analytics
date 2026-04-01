import { useState } from 'react'
import { NoteCard } from '../../components/domain/cards'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { buildEntityLabel } from '../../domain/selectors'
import type { EntityType } from '../../domain/types'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

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
  const entityOptions = {
    pair: seed.pairs.map((item) => ({ value: item.id, label: item.symbol })),
    currency: seed.currencies.map((item) => ({ value: item.code, label: `${item.code} · ${item.name}` })),
    event: seed.events.map((item) => ({ value: item.id, label: item.title })),
    forecast: seed.forecasts.map((item) => ({ value: item.id, label: item.pairId.toUpperCase() })),
    simulation: seed.simulations.filter((item) => item.userId === user?.id).map((item) => ({ value: item.id, label: `${item.pairId.toUpperCase()} · ${item.scenarioType}` })),
    strategy: seed.strategies.map((item) => ({ value: item.id, label: item.name })),
  } satisfies Record<EntityType, Array<{ value: string; label: string }>>
  if (loading || !data) return <LoadingPanel label="Loading notes workspace…" />
  return (
    <Page title="Notes & Saved Analysis" description="Structured research notes attach directly to pairs, currencies, events, simulations, and strategies.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle eyebrow="Create note" title="Research trail" />
          <div className="space-y-3">
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea className="min-h-40 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="Body" value={body} onChange={(event) => setBody(event.target.value)} />
            <label className="text-sm text-[var(--muted)]">Template
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={template} onChange={(event) => setTemplate(event.target.value)}>
                <option value="pair thesis">Pair thesis</option>
                <option value="event prep">Event prep</option>
                <option value="post-simulation review">Post-simulation review</option>
                <option value="weekly macro summary">Weekly macro summary</option>
                <option value="risk observation">Risk observation</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Tags
              <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="macro, usd, cpi" value={tags} onChange={(event) => setTags(event.target.value)} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-[var(--muted)]">Linked entity type
                <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={entityType} onChange={(event) => {
                  const next = event.target.value as EntityType
                  setEntityType(next)
                  setEntityId(entityOptions[next][0]?.value ?? '')
                }}>
                  <option value="pair">Pair</option>
                  <option value="currency">Currency</option>
                  <option value="event">Event</option>
                  <option value="forecast">Forecast</option>
                  <option value="simulation">Simulation</option>
                  <option value="strategy">Strategy</option>
                </select>
              </label>
              <label className="text-sm text-[var(--muted)]">Linked entity
                <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={entityId} onChange={(event) => setEntityId(event.target.value)}>
                  {entityOptions[entityType].map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <PrimaryButton
              onClick={async () => {
                if (!user || !title || !body || !entityId) return
                const note = {
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
                setData([note, ...data])
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
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((note) => (
            <div className="space-y-2" key={note.id}>
              <NoteCard note={note} />
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                {note.linkedEntities.map((entity) => (
                  <span className="rounded-full border border-[var(--line)] px-3 py-1" key={`${note.id}-${entity.entityType}-${entity.entityId}`}>
                    {buildEntityLabel(seed, entity.entityType === 'simulation' || entity.entityType === 'strategy' ? 'forecast' : entity.entityType, entity.entityId)}
                  </span>
                ))}
                <button className="rounded-full border border-[var(--line)] px-3 py-1" onClick={() => void appApi.pinNote(note.id, !note.pinned).then((updated) => setData(data.map((item) => item.id === note.id ? updated : item)))} type="button">
                  {note.pinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}
