import { useState } from 'react'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { appApi, getSeed } from '../../domain/services/mockApi'
import { useAppState } from '../../app/AppState'
import { useAsyncResource } from '../../lib/useAsyncResource'
import { PrimaryButton } from '../shared'

export const AdminPage = () => {
  const { user, adminMutation, setAdminMutation } = useAppState()
  const { data, loading } = useAsyncResource(async () => getSeed(), [user?.id, adminMutation])
  const [currency, setCurrency] = useState('JPY')
  const [eventId, setEventId] = useState('evt-us-cpi')
  if (loading || !data) return <LoadingPanel label="Loading admin inspector…" />
  if (user?.role !== 'admin') return <Page title="Admin" description="Admin access required."><Panel>Current persona does not have access to the demo inspector.</Panel></Page>
  return (
    <Page title="Admin / Demo Inspector" description="Inspect seeded entities and push local state mutations through the full app to validate cross-page consistency.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle eyebrow="Mutation controls" title="Demo state overlays" />
          <div className="space-y-3">
            <select className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {data.currencies.map((item) => (
                <option key={item.code} value={item.code}>{item.code}</option>
              ))}
            </select>
            <PrimaryButton
              onClick={() =>
                void setAdminMutation({
                  ...adminMutation,
                  currencyShifts: { ...adminMutation.currencyShifts, [currency]: (adminMutation.currencyShifts[currency] ?? 0) + 8 },
                  pairVolatilityShifts: {
                    ...adminMutation.pairVolatilityShifts,
                    ...Object.fromEntries(data.pairs.filter((pair) => pair.baseCode === currency || pair.quoteCode === currency).map((pair) => [pair.id, (adminMutation.pairVolatilityShifts[pair.id] ?? 0) + 12])),
                  },
                })
              }
              type="button"
            >
              Inject volatility spike
            </PrimaryButton>
            <PrimaryButton
              onClick={() =>
                void setAdminMutation({
                  ...adminMutation,
                  currencyShifts: { ...adminMutation.currencyShifts, [currency]: (adminMutation.currencyShifts[currency] ?? 0) - 6 },
                })
              }
              secondary
              type="button"
            >
              Shift currency weaker
            </PrimaryButton>
            <select className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" value={eventId} onChange={(event) => setEventId(event.target.value)}>
              {data.events.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
            <PrimaryButton
              onClick={() =>
                void setAdminMutation({
                  ...adminMutation,
                  triggeredEventIds: Array.from(new Set([...adminMutation.triggeredEventIds, eventId])),
                })
              }
              secondary
              type="button"
            >
              Trigger event outcome
            </PrimaryButton>
            <PrimaryButton
              onClick={async () => {
                await appApi.resetAdminMutation()
                await setAdminMutation({ currencyShifts: {}, pairVolatilityShifts: {}, newsToneShifts: {}, triggeredEventIds: [] })
              }}
              secondary
              type="button"
            >
              Reset overlays
            </PrimaryButton>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Seeded collections" title="Dataset inspection" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] p-4">Users: {data.users.length}</div>
            <div className="rounded-2xl border border-[var(--line)] p-4">Currencies: {data.currencies.length}</div>
            <div className="rounded-2xl border border-[var(--line)] p-4">Pairs: {data.pairs.length}</div>
            <div className="rounded-2xl border border-[var(--line)] p-4">Events: {data.events.length}</div>
            <div className="rounded-2xl border border-[var(--line)] p-4">News: {data.news.length}</div>
            <div className="rounded-2xl border border-[var(--line)] p-4">Forecasts: {data.forecasts.length}</div>
          </div>
        </Panel>
      </div>
    </Page>
  )
}
