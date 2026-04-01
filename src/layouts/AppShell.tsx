import { Bell, BriefcaseBusiness, CandlestickChart, Globe2, LayoutDashboard, LineChart, NotebookPen, Search, Settings, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appApi } from '../domain/services/mockApi'
import { useAppState } from '../app/AppState'
import { cn } from '../lib/utils'
import type { NotificationItem } from '../domain/types'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', short: 'Dash', icon: LayoutDashboard },
  { to: '/app/markets', label: 'Markets', short: 'Mkt', icon: CandlestickChart },
  { to: '/app/currencies', label: 'Currencies', short: 'FX', icon: Globe2 },
  { to: '/app/simulation', label: 'Simulation Lab', short: 'Sim', icon: LineChart },
  { to: '/app/strategies', label: 'Strategy Lab', short: 'Strat', icon: Sparkles },
  { to: '/app/events', label: 'News & Events', short: 'News', icon: Bell },
  { to: '/app/forecast', label: 'Forecasts', short: 'Frcst', icon: LineChart },
  { to: '/app/portfolio', label: 'Portfolio', short: 'Port', icon: BriefcaseBusiness },
  { to: '/app/watchlist', label: 'Watchlist', short: 'Watch', icon: ShieldAlert },
  { to: '/app/notes', label: 'Notes', short: 'Notes', icon: NotebookPen },
  { to: '/app/settings', label: 'Settings', short: 'Set', icon: Settings },
]

export const AppShell = () => {
  const { user } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Array<{ id: string; label: string; href: string; type: string }>>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationOpen, setNotificationOpen] = useState(false)

  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    void appApi.searchEntities(search).then(setResults)
  }, [search])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }
    void appApi.getCurrentUserWorkspace().then((workspace) => {
      setNotifications(workspace.notifications ?? [])
    })
  }, [user?.id, location.pathname])

  const initials = user?.displayName
    .split(' ')
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#131313] text-[var(--text)]">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-[#3d494626] bg-[#131313] px-4">
        <div className="flex items-center gap-6">
          <Link className="font-display text-lg font-bold tracking-[-0.04em] text-[#70d8c8]" to="/app/dashboard">
            SOVEREIGN ANALYTICS
          </Link>
          <div className="relative hidden md:flex">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="h-8 w-64 border-b border-[#3d4946] bg-[#0e0e0e] px-8 text-[10px] uppercase tracking-[0.14em] text-[var(--text)] outline-none placeholder:text-[#879390]"
              placeholder="Search pairs, currencies, events..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {results.length ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 border border-[#3d494626] bg-[#1c1b1b] shadow-2xl">
                {results.map((result) => (
                  <button
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-[#2a2a2a]"
                    key={result.id}
                    onClick={() => {
                      navigate(result.href)
                      setSearch('')
                    }}
                    type="button"
                  >
                    <span>{result.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{result.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 border border-[#70d8c833] bg-[#32a1921a] px-2 py-1 md:flex">
            <span className="size-1.5 animate-pulse bg-[#70d8c8]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#70d8c8]">Demo Data</span>
          </div>
          <div className="relative">
            <button className="p-1 text-[var(--muted)] transition hover:bg-[#353534] hover:text-[var(--text)]" onClick={() => setNotificationOpen((value) => !value)} type="button">
              <Bell className="size-5" />
            </button>
            {notifications.length ? <span className="absolute -right-1 -top-1 bg-[#ffba38] px-1 py-0.5 font-mono text-[9px] font-semibold text-[#131313]">{notifications.length}</span> : null}
            {notificationOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-96 border border-[#3d494626] bg-[#1c1b1b] p-3 shadow-2xl">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Notifications</div>
                <div className="space-y-2">
                  {notifications.length ? notifications.map((item) => (
                    <button
                      className="w-full border border-[#3d494626] bg-[#201f1f] p-3 text-left"
                      key={item.id}
                      onClick={() => {
                        setNotificationOpen(false)
                        if (item.href) navigate(item.href)
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{item.title}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.level}</div>
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{item.body}</div>
                    </button>
                  )) : <div className="border border-[#3d494626] p-3 text-sm text-[var(--muted)]">No active notifications.</div>}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex cursor-pointer items-center gap-2 bg-[#2a2a2a] px-2 py-1 transition hover:bg-[#353534]">
            <div className="flex size-6 items-center justify-center bg-[#0e0e0e] font-mono text-[10px] uppercase text-[#70d8c8]">{initials || 'SA'}</div>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] md:block">{user?.displayName ?? 'Analyst'}</span>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 top-12 z-40 flex w-16 flex-col items-center border-r border-[#3d494626] bg-[#131313] py-4">
        <div className="flex w-full flex-col gap-1">
          {navItems.filter((item) => item.to !== '/app/admin').map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-3 text-[#b1cad7] transition-all hover:bg-[#1c1b1b] hover:text-white',
                    isActive && 'border-l-2 border-[#70d8c8] bg-[#1c1b1b] text-[#70d8c8]',
                  )
                }
                to={item.to}
              >
                <Icon className="mb-1 size-4" />
                <span className="text-[10px] uppercase scale-90">{item.short}</span>
              </NavLink>
            )
          })}
          {user?.role === 'admin' ? (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'mt-4 flex flex-col items-center justify-center py-3 text-[#b1cad7] transition-all hover:bg-[#1c1b1b] hover:text-white',
                  isActive && 'border-l-2 border-[#70d8c8] bg-[#1c1b1b] text-[#70d8c8]',
                )
              }
              to="/app/admin"
            >
              <ShieldAlert className="mb-1 size-4" />
              <span className="text-[10px] uppercase scale-90">Admin</span>
            </NavLink>
          ) : null}
        </div>
      </nav>

      <main className="ml-16 mt-12 min-h-[calc(100vh-3rem)] p-4">
        <Outlet />
      </main>
    </div>
  )
}
