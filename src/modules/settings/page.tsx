import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingPanel, Page, Panel, SectionTitle } from '../../components/ui/primitives'
import { authApi } from '../../domain/services/mockApi'
import { useAppState } from '../../app/AppState'
import { PrimaryButton } from '../shared'

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { user, saveSettings, refreshUser } = useAppState()
  const [dashboardMode, setDashboardMode] = useState(user?.settings.dashboardMode ?? 'research-heavy')
  const [accountCurrency, setAccountCurrency] = useState(user?.settings.defaultAccountCurrency ?? 'USD')
  if (!user) return <LoadingPanel label="Loading settings…" />
  return (
    <Page title="Settings & Profile" description="Preferences here immediately influence dashboard composition, simulation defaults, chart setup, and local auth behavior.">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle eyebrow="Profile" title={user.displayName} />
          <div className="space-y-2 text-sm text-[var(--muted)]">
            <div>{user.email}</div>
            <div>Persona role: {user.role}</div>
            <div>Analysis focus: {user.analysisFocus}</div>
          </div>
          <div className="mt-6">
            <PrimaryButton
              onClick={async () => {
                await authApi.logout()
                await refreshUser()
                navigate('/login')
              }}
              secondary
              type="button"
            >
              Logout
            </PrimaryButton>
          </div>
        </Panel>
        <Panel>
          <SectionTitle eyebrow="Preferences" title="Immediate app defaults" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[var(--muted)]">Dashboard mode
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={dashboardMode} onChange={(event) => setDashboardMode(event.target.value as typeof dashboardMode)}>
                <option value="compact">Compact</option>
                <option value="research-heavy">Research-heavy</option>
                <option value="simulation-heavy">Simulation-heavy</option>
              </select>
            </label>
            <label className="text-sm text-[var(--muted)]">Account currency
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-[var(--text)]" value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </label>
          </div>
          <div className="mt-4">
            <PrimaryButton
              onClick={async () => {
                await saveSettings({
                  ...user.settings,
                  dashboardMode,
                  defaultAccountCurrency: accountCurrency,
                })
              }}
              type="button"
            >
              Save settings
            </PrimaryButton>
          </div>
        </Panel>
      </div>
    </Page>
  )
}
