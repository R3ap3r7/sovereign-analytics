import { Bell, BookOpenText, BriefcaseBusiness, CandlestickChart, Globe2, LayoutDashboard, LineChart, NotebookPen, Search, Settings, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appApi } from '../domain/services/mockApi'
import { useAppState } from '../app/AppState'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/markets', label: 'Markets', icon: CandlestickChart },
  { to: '/app/currencies', label: 'Currencies', icon: Globe2 },
  { to: '/app/simulation', label: 'Simulation Lab', icon: LineChart },
  { to: '/app/strategies', label: 'Strategy Lab', icon: Sparkles },
  { to: '/app/events', label: 'News & Events', icon: Bell },
  { to: '/app/forecast', label: 'Forecasts', icon: LineChart },
  { to: '/app/portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
  { to: '/app/watchlist', label: 'Watchlist', icon: ShieldAlert },
  { to: '/app/notes', label: 'Notes', icon: NotebookPen },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export const AppShell = () => {
  const { user } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Array<{ id: string; label: string; href: string; type: string }>>([])

  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    void appApi.searchEntities(search).then(setResults)
  }, [search])

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[color:var(--panel)]/80 p-5 lg:border-b-0 lg:border-r">
          <Link className="flex items-center gap-3" to="/app/dashboard">
            <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] p-3">
              <BookOpenText className="size-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Mock / Demo</div>
              <div className="text-lg font-semibold">Sovereign Analytics</div>
            </div>
          </Link>
          <nav className="mt-8 space-y-1">
            {navItems
              .filter((item) => item.to !== '/app/admin')
              .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                        isActive ? 'bg-[color:var(--panel-3)] text-[var(--text)]' : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]',
                      )
                    }
                    to={item.to}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            {user?.role === 'admin' ? (
              <NavLink className={({ isActive }) => cn('mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition', isActive ? 'bg-[color:var(--panel-3)] text-[var(--text)]' : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]')} to="/app/admin">
                <ShieldAlert className="size-4" />
                Admin
              </NavLink>
            ) : null}
          </nav>
          <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[color:var(--panel-2)]/60 p-4 text-sm text-[var(--muted)]">
            Demo state persists locally. Personas, saved simulations, notes, and inspector mutations are browser-only.
          </div>
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(17,20,18,0.82)] px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{location.pathname.replace('/app/', '').replaceAll('/', ' / ') || 'dashboard'}</div>
                <div className="mt-1 text-lg font-semibold">{user?.displayName ?? 'Analyst session'}</div>
              </div>
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel)] px-11 py-3 text-sm outline-none ring-0 placeholder:text-[var(--muted)]"
                  placeholder="Search pairs, currencies, events, notes, simulations…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {results.length ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-2xl border border-[var(--line)] bg-[color:var(--panel)] p-2 shadow-2xl">
                    {results.map((result) => (
                      <button
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
                        key={result.id}
                        onClick={() => {
                          navigate(result.href)
                          setSearch('')
                        }}
                        type="button"
                      >
                        <span>{result.label}</span>
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{result.type}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className="flex-1 px-5 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
