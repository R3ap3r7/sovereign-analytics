import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell'
import { CurrencyDetailPage, CurrenciesPage } from '../modules/currencies/pages'
import { DashboardPage } from '../modules/dashboard/page'
import { EventDetailPage, EventsPage } from '../modules/events/pages'
import { ForecastPage } from '../modules/forecast/page'
import { ForgotPasswordPage, LandingPage, LoginPage, ProtectedRedirect, ResetSuccessPage, SignupPage, VerifyPage } from '../modules/auth/pages'
import { MarketComparePage, MarketsPage, PairDetailPage } from '../modules/markets/pages'
import { NotesPage } from '../modules/notes/page'
import { PortfolioPage } from '../modules/portfolio/page'
import { SettingsPage } from '../modules/settings/page'
import { SimulationLabPage } from '../modules/simulation/page'
import { StrategyLabPage } from '../modules/strategies/page'
import { WatchlistPage } from '../modules/watchlist/page'
import { AdminPage } from '../modules/admin/page'
import { useAppState } from '../app/AppState'
import { appApi } from '../domain/services/mockApi'
import { useState } from 'react'
import { Page, Panel } from '../components/ui/primitives'
import { PrimaryButton } from '../modules/shared'

const OnboardingPage = () => {
  const { user, refreshUser } = useAppState()
  const [focus, setFocus] = useState(user?.analysisFocus ?? 'macro')
  return (
    <Page title="Onboarding" description="Initial preferences shape the dashboard layout, simulation defaults, and the ranking of currencies, pairs, and events.">
      <Panel className="mx-auto max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--muted)]">Experience level
            <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" defaultValue={user?.experienceLevel}>
              <option>beginner</option>
              <option>intermediate</option>
              <option>advanced</option>
              <option>expert</option>
            </select>
          </label>
          <label className="text-sm text-[var(--muted)]">Primary focus
              <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" value={focus} onChange={(event) => setFocus(event.target.value as typeof focus)}>
              <option value="macro">Macro context</option>
              <option value="technical">Technical analysis</option>
              <option value="simulation">Simulation</option>
            </select>
          </label>
          <label className="text-sm text-[var(--muted)]">Favorite currencies
            <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" defaultValue="USD, EUR, JPY" />
          </label>
          <label className="text-sm text-[var(--muted)]">Favorite pairs
            <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3" defaultValue="eur-usd, usd-jpy" />
          </label>
        </div>
        <div className="mt-6">
          <PrimaryButton
            onClick={async () => {
              await appApi.completeOnboarding({
                favoriteCurrencies: ['USD', 'EUR', 'JPY'],
                favoritePairs: ['eur-usd', 'usd-jpy'],
                dashboardPreset: focus === 'simulation' ? 'simulation-heavy' : focus === 'technical' ? 'compact' : 'research-heavy',
                defaultAccountCurrency: 'USD',
              })
              await refreshUser()
            }}
            type="button"
          >
            Finish onboarding
          </PrimaryButton>
        </div>
      </Panel>
    </Page>
  )
}

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<SignupPage />} path="/signup" />
      <Route element={<ForgotPasswordPage />} path="/forgot-password" />
      <Route element={<ResetSuccessPage />} path="/reset-success" />
      <Route element={<VerifyPage />} path="/verify" />
      <Route
        element={
          <ProtectedRedirect>
            <OnboardingPage />
          </ProtectedRedirect>
        }
        path="/onboarding"
      />
      <Route
        element={
          <ProtectedRedirect>
            <AppShell />
          </ProtectedRedirect>
        }
        path="/app"
      >
        <Route element={<Navigate replace to="/app/dashboard" />} index />
        <Route element={<DashboardPage />} path="dashboard" />
        <Route element={<MarketsPage />} path="markets" />
        <Route element={<MarketComparePage />} path="markets/compare" />
        <Route element={<PairDetailPage />} path="markets/:pairId" />
        <Route element={<CurrenciesPage />} path="currencies" />
        <Route element={<CurrencyDetailPage />} path="currencies/:currencyCode" />
        <Route element={<EventsPage />} path="events" />
        <Route element={<EventDetailPage />} path="events/:eventId" />
        <Route element={<SimulationLabPage />} path="simulation" />
        <Route element={<StrategyLabPage />} path="strategies" />
        <Route element={<ForecastPage />} path="forecast" />
        <Route element={<PortfolioPage />} path="portfolio" />
        <Route element={<WatchlistPage />} path="watchlist" />
        <Route element={<NotesPage />} path="notes" />
        <Route element={<SettingsPage />} path="settings" />
        <Route element={<AdminPage />} path="admin" />
      </Route>
    </Routes>
  </BrowserRouter>
)
