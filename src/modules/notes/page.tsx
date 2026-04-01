import { useState } from 'react'
import { NoteCard } from '../../components/domain/cards'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi } from '../../domain/services/mockApi'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const NotesPage = () => {
  const { user } = useAppState()
  const { data, loading, setData } = useAsyncResource(() => appApi.listNotes(), [user?.id])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  if (loading || !data) return <LoadingPanel label="Loading notes workspace…" />
  return (
    <Page title="Notes & Saved Analysis" description="Structured research notes attach directly to pairs, currencies, events, simulations, and strategies.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle eyebrow="Create note" title="Research trail" />
          <div className="space-y-3">
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea className="min-h-40 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" placeholder="Body" value={body} onChange={(event) => setBody(event.target.value)} />
            <PrimaryButton
              onClick={async () => {
                if (!user || !title || !body) return
                const note = {
                  id: `note-${Date.now()}`,
                  userId: user.id,
                  title,
                  body,
                  tags: ['manual'],
                  template: 'pair thesis',
                  pinned: false,
                  linkedEntities: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                await appApi.createNote(note)
                setData([note, ...data])
                setTitle('')
                setBody('')
              }}
              type="button"
            >
              Save note
            </PrimaryButton>
          </div>
        </Panel>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </Page>
  )
}
