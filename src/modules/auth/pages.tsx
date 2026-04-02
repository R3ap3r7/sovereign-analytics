import {
  ArrowRight,
  BriefcaseBusiness,
  CandlestickChart,
  CheckCircle2,
  KeyRound,
  Mail,
  Radar,
  Shield,
  Terminal,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { authApi, getSeed, appApi } from '../../domain/services/api'
import { cn } from '../../lib/utils'

const AuthInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'w-full border-0 border-b border-[rgba(118,117,120,0.55)] bg-transparent px-0 py-3 text-sm text-[#f2efeb] outline-none placeholder:text-[#707782] focus:border-[#d8b574] focus:ring-0',
      className,
    )}
  />
)

const AuthField = ({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <label className="block space-y-2">
    <span className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8f98a3]">
      <span>{label}</span>
      {action}
    </span>
    {children}
  </label>
)

const AuthButton = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={cn(
      'inline-flex w-full items-center justify-center rounded-[4px] bg-[linear-gradient(135deg,#e9c176,#7a5510)] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#281a00] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70',
      className,
    )}
  />
)

const AuthLinkButton = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    className="inline-flex items-center justify-center rounded-[4px] border border-[rgba(118,117,120,0.26)] bg-[#111215] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#b9c1cb] transition hover:border-[rgba(216,181,116,0.34)] hover:text-[#ece7df]"
    to={to}
  >
    {children}
  </Link>
)

const AuthPanel = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) => (
  <div className="rounded-[4px] border border-[rgba(118,117,120,0.18)] bg-[#16181b] p-4">
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-[4px] bg-[#0f1113] text-[#d8b574]">{icon}</div>
      <div className="font-display text-lg font-semibold tracking-[-0.04em] text-[#f1ede7]">{title}</div>
    </div>
    <div className="mt-3 text-sm leading-6 text-[#9ea6b0]">{body}</div>
  </div>
)

const AuthStats = () => {
  const seed = getSeed()
  const stats = [
    { label: 'Pairs', value: seed.pairs.length },
    { label: 'Events', value: seed.events.length },
    { label: 'News', value: seed.news.length },
  ]

  return (
    <div className="grid gap-px bg-[rgba(72,72,75,0.4)] sm:grid-cols-3">
      {stats.map((stat) => (
        <div className="bg-[#15171a] px-4 py-4" key={stat.label}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#8f98a3]">{stat.label}</div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}

const statusLabel = (locked: boolean, verified: boolean, status: string) => {
  if (locked) return 'Locked'
  if (!verified || status === 'unverified') return 'Verify'
  return 'Ready'
}

const AuthWorkspace = ({
  eyebrow,
  title,
  description,
  formTitle,
  formDescription,
  form,
  sideTitle,
  sideChildren,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  formTitle?: string
  formDescription?: string
  form: React.ReactNode
  sideTitle: string
  sideChildren: React.ReactNode
  footer?: React.ReactNode
}) => (
  <div className="min-h-screen overflow-x-hidden bg-[#0c0d0f] text-[#ece8e3]">
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-[rgba(72,72,75,0.22)] bg-[#0c0d0f]/95 px-6 py-5 backdrop-blur lg:px-10">
      <Link className="flex items-center gap-3" to="/">
        <Shield className="size-5 text-[#d8b574]" />
        <span className="font-display text-lg font-semibold tracking-[-0.05em] text-[#f3eee7]">SOVEREIGN ANALYTICS</span>
      </Link>
      <Link className="text-[11px] uppercase tracking-[0.22em] text-[#9ea6b0] transition hover:text-[#ece8e3]" to="/">
        Overview
      </Link>
    </header>

    <main className="grid min-h-screen pt-[78px] lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden overflow-hidden border-r border-[rgba(72,72,75,0.18)] bg-[#111214] lg:flex">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(72,72,75,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(72,72,75,0.14)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(216,181,116,0.08),transparent_36%)]" />
        <div className="relative flex w-full flex-col justify-between px-16 py-14 xl:px-20">
          <div className="max-w-xl space-y-8">
            <div className="inline-flex items-center gap-3 text-[#d8b574]">
              <span className="h-px w-8 bg-current" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em]">{eyebrow}</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-[4.3rem] font-semibold uppercase leading-[0.92] tracking-[-0.08em] text-[#f4f0ea] xl:text-[5.1rem]">
                {title}
              </h1>
              <p className="max-w-lg text-sm leading-7 text-[#9da5af]">{description}</p>
            </div>
            <AuthStats />
            <div className="space-y-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8f98a3]">{sideTitle}</div>
              {sideChildren}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#747b84]">
            <div className="size-2 rounded-full bg-[#d8b574]/60" />
            <span>Workspace Access</span>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[calc(100vh-78px)] items-center justify-center overflow-hidden px-6 py-10 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,181,116,0.06),transparent_45%)]" />
        <div className="relative z-10 w-full max-w-[460px] space-y-6">
          <div className="space-y-5 lg:hidden">
            <div className="inline-flex items-center gap-3 text-[#d8b574]">
              <span className="h-px w-7 bg-current" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em]">{eyebrow}</span>
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-[2.7rem] font-semibold uppercase leading-[0.94] tracking-[-0.08em] text-[#f4f0ea]">{title}</h1>
              <p className="text-sm leading-7 text-[#9da5af]">{description}</p>
            </div>
            <AuthStats />
          </div>

          <div className="relative overflow-hidden rounded-[4px] border border-[rgba(118,117,120,0.2)] bg-[#17191c] p-7 shadow-[0_28px_100px_rgba(0,0,0,0.42)] sm:p-9">
            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#d8b574] to-transparent opacity-75" />
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-semibold tracking-[-0.05em] text-[#f4f0ea]">{formTitle ?? title}</h2>
              {formDescription ? <p className="text-sm text-[#98a0a8]">{formDescription}</p> : null}
            </div>
            <div className="mt-8 space-y-6">{form}</div>
          </div>

          {footer ? <div className="space-y-3">{footer}</div> : null}
        </div>
      </section>
    </main>
  </div>
)

export const LandingPage = () => (
  (() => {
    const seed = getSeed()
    const highlights = [
      `Track ${seed.currencies.length} currency profiles with linked macro context and strength narratives.`,
      `Analyze ${seed.pairs.length} FX pairs across events, technical structure, simulations, and forecasts.`,
      `Explore ${seed.events.length + seed.news.length}+ connected macro events and market stories across the platform.`,
    ]
    const modules = [
      {
        code: 'M_01',
        title: 'Market Overview',
        href: '/login',
        summary: 'Monitor volatility, strength rankings, pair dispersion, and event pressure across the global FX workspace.',
      },
      {
        code: 'M_02',
        title: 'Pair Research',
        href: '/login',
        summary: 'Deep pair workspaces combining macro differential, technical structure, news context, forecasts, simulations, and notes.',
      },
      {
        code: 'M_03',
        title: 'Simulation Lab',
        href: '/login',
        summary: 'Stress-test hypothetical central bank decisions, leverage assumptions, stop widths, and path-dependent drawdowns.',
      },
      {
        code: 'M_04',
        title: 'Virtual Portfolio',
        href: '/login',
        summary: 'Track paper positions, synthetic P/L, currency concentration, and linked journal reasoning without financial risk.',
      },
      {
        code: 'M_05',
        title: 'Forecast Studio',
        href: '/login',
        summary: 'Inspect path bands, uncertainty curves, and driver weighting aligned with the same pair narratives used elsewhere.',
      },
    ]
    const feedItems = seed.news.slice(0, 4).map((item) => item.headline.toUpperCase().replace(/[^A-Z0-9/ ]/g, '').trim())

    return (
      <div className="min-h-screen overflow-x-hidden bg-[var(--bg)]">
        <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-[rgba(61,73,70,0.2)] bg-[#131313] px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Terminal className="size-5 text-[#70d8c8]" />
            <h1 className="font-display text-lg font-bold tracking-[-0.04em] text-[#70d8c8] lg:text-xl">SOVEREIGN ANALYTICS</h1>
          </div>
          <Link className="bg-[#70d8c8] px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#003731] transition hover:bg-[#32a192]" to="/login">
            Open Workspace
          </Link>
        </header>

        <main className="flex w-full flex-col bg-[#131313]">
          <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
            <section className="space-y-6 p-6 lg:p-10">
              <div className="space-y-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#bcc9c5]">Forex Analytics Platform</div>
                <h2 className="font-display mt-4 text-[3.4rem] font-bold uppercase leading-[0.9] tracking-[-0.08em] text-[#e5e2e1] lg:text-[6.4rem]">
                  THE <span className="text-[#70d8c8]">BRUTALIST</span>
                  <br />
                  INTELLECT
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-[#b1cad7]">
                  Sovereign Analytics is a macro-aware Forex research and simulation platform. Study currencies, pairs, events, scenarios,
                  forecasts, paper positions, and saved reasoning inside one connected product experience.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="group flex w-full items-center justify-between bg-[#32a192] px-6 py-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-[#00302a] transition hover:bg-[#70d8c8]" to="/login">
                  <span>OPEN PLATFORM</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </Link>
                <Link className="w-full border border-[rgba(61,73,70,0.3)] px-6 py-4 text-left font-display text-sm font-medium uppercase tracking-[0.14em] text-[#b1cad7] transition hover:bg-[#353534]" to="/signup">
                  CREATE ACCOUNT
                </Link>
              </div>

              <div className="grid gap-px bg-[rgba(61,73,70,0.12)] lg:grid-cols-3">
                {highlights.map((highlight) => (
                  <div className="bg-[#1c1b1b] p-4" key={highlight}>
                    <p className="text-sm leading-7 text-[#b1cad7]">{highlight}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#0e0e0e] p-6 lg:p-10">
              <h3 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#bcc9c5]">Platform Areas</h3>
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <Link
                    className={`block p-5 transition hover:bg-[#2a2a2a] ${index === 0 ? 'border-l-4 border-[#70d8c8] bg-[#1c1b1b]' : 'border-l-4 border-[#3d4946] bg-[#1c1b1b]'}`}
                    key={module.code}
                    to={module.href}
                  >
                    <div className="mb-2 flex items-start gap-4">
                      <h4 className="font-display text-lg font-bold uppercase tracking-[-0.03em] text-[#e5e2e1]">{module.title}</h4>
                    </div>
                    <p className="text-xs leading-6 text-[#b1cad7]">{module.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="mx-6 border-l-2 border-[#ffba38] bg-[#ffba3817] p-4 lg:mx-10">
            <p className="max-w-4xl text-[11px] leading-6 text-[#ffdeac]">
              Historical FX series, current rates, and news flows are available in the workspace. Execution and brokerage connectivity remain external.
            </p>
          </div>

          <div className="grid gap-px bg-[rgba(61,73,70,0.12)] px-6 py-6 lg:grid-cols-3 lg:px-10">
            <div className="bg-[#1c1b1b] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bcc9c5]">Connected Product Flow</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['LOGIN', 'ONBOARDING', 'DASHBOARD', 'PAIR_PAGE', 'SIMULATION', 'PORTFOLIO', 'NOTES'].map((step) => (
                  <span className="border border-[rgba(61,73,70,0.24)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#e5e2e1]" key={step}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[#1c1b1b] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bcc9c5]">Research Flow</div>
              <div className="mt-3 text-sm leading-7 text-[#b1cad7]">
                Move from macro context into a pair, launch a prefilled simulation, save the scenario, then carry that context into watchlists, notes, and portfolio exposure.
              </div>
            </div>
            <div className="bg-[#1c1b1b] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bcc9c5]">Shared Data Model</div>
              <div className="mt-3 text-sm leading-7 text-[#b1cad7]">
                The same underlying entities power currencies, pairs, events, forecasts, alerts, and personas so the product stays structurally connected.
              </div>
            </div>
          </div>

          <div className="overflow-hidden border-y border-[rgba(61,73,70,0.1)] bg-[#353534] py-3">
            <div className="animate-marquee flex w-max items-center gap-8 px-6">
              <span className="font-mono text-[10px] font-bold text-[#70d8c8]">MARKET CONTEXT</span>
              {[...feedItems, ...feedItems].map((item, index) => (
                <div className="flex items-center gap-8" key={`${item}-${index}`}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b1cad7]">{item}</span>
                  <span className="text-[#879390]">|</span>
                </div>
              ))}
            </div>
          </div>

          <footer className="flex flex-col justify-between gap-8 border-t border-[rgba(61,73,70,0.1)] bg-[#0e0e0e] px-6 py-10 md:flex-row md:items-start lg:px-10">
            <div className="space-y-4">
              <div className="font-display text-lg font-bold tracking-[-0.03em] text-[#70d8c8]">SOVEREIGN ANALYTICS</div>
              <p className="text-xs leading-5 text-[#b1cad7] opacity-60">
                ©2026 SOVEREIGN ANALYTICS.
                <br />
                Forex analytics and scenario research.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <Link className="font-mono text-xs uppercase tracking-[0.18em] text-[#b1cad7] transition hover:text-[#70d8c8]" to="/login">
                Markets
              </Link>
              <Link className="font-mono text-xs uppercase tracking-[0.18em] text-[#b1cad7] transition hover:text-[#70d8c8]" to="/signup">
                Currencies
              </Link>
              <Link className="font-mono text-xs uppercase tracking-[0.18em] text-[#b1cad7] transition hover:text-[#70d8c8]" to="/login">
                Simulation Lab
              </Link>
              <Link className="font-mono text-xs uppercase tracking-[0.18em] text-[#b1cad7] transition hover:text-[#70d8c8]" to="/login">
                Portfolio
              </Link>
            </div>
          </footer>
        </main>
      </div>
    )
  })()
)

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshUser } = useAppState()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const seed = getSeed()
  const visibleUsers = [...seed.users]
    .sort((left, right) => Number(left.locked) - Number(right.locked) || Number(!left.verified) - Number(!right.verified))
    .slice(0, 5)
  const quickAccessUsers = visibleUsers.slice(0, 2)
  const metrics = [
    { label: 'Tracked pairs', value: String(seed.pairs.length).padStart(2, '0'), detail: 'FX coverage' },
    { label: 'Macro events', value: String(seed.events.length).padStart(2, '0'), detail: 'calendar items' },
    { label: 'Headlines', value: String(seed.news.length).padStart(2, '0'), detail: 'live context' },
  ]
  const intendedPath = (location.state as { from?: string } | null)?.from
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const result = await authApi.login(email, password, intendedPath)
      await refreshUser()
      navigate(result.requiresVerification ? '/verify' : intendedPath ?? '/app/dashboard')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to log in.')
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <main className="grid min-h-screen lg:grid-cols-[minmax(420px,0.42fr)_minmax(0,0.58fr)]">
        <aside className="relative hidden border-r border-[color:var(--line)] bg-[rgba(7,13,19,0.72)] lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'linear-gradient(to right, rgba(141,164,179,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(141,164,179,0.16) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(105,211,192,0.12),transparent_38%)]" />
          <div className="relative z-10 flex w-full flex-col px-10 py-12 xl:px-14 xl:py-14">
            <div>
              <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">Workspace access</div>
              <Link className="inline-block" to="/">
                <h1 className="font-display text-5xl font-semibold tracking-[-0.07em] text-[var(--accent)] xl:text-6xl">Sovereign Analytics</h1>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted)]">
                Sign in to the live FX research workspace for currencies, events, portfolio tracking, and forecasting.
              </p>
            </div>

            <div className="mt-12 grid gap-px bg-[color:var(--line)]">
              {metrics.map((metric) => (
                <div className="flex items-center justify-between bg-[var(--panel-4)] px-5 py-4" key={metric.label}>
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{metric.label}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:rgba(142,162,175,0.72)]">{metric.detail}</div>
                  </div>
                  <div className="font-mono text-lg font-bold tracking-[0.12em] text-[var(--accent)]">{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <div className="mb-5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Operator accounts</div>
              <div className="space-y-3">
                {visibleUsers.map((user) => {
                  const badgeClass = user.locked
                    ? 'bg-[rgba(227,128,120,0.14)] text-[var(--danger)]'
                    : !user.verified || user.status === 'unverified'
                      ? 'bg-[rgba(154,185,208,0.14)] text-[var(--accent-2)]'
                      : 'bg-[rgba(104,199,157,0.12)] text-[var(--success)]'

                  return (
                    <button
                      className="flex w-full items-center justify-between border border-transparent bg-[var(--panel-4)] px-4 py-3 text-left transition hover:border-[color:var(--line-strong)] hover:bg-[var(--panel-2)]"
                      key={user.id}
                      onClick={() => {
                        setEmail(user.email)
                        setPassword(user.password)
                        setError('')
                      }}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 items-center justify-center border border-[color:var(--line)] bg-[var(--panel-3)] text-[var(--accent-2)]">
                          <UserRound className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">{user.displayName}</div>
                          <div className="truncate text-xs text-[var(--muted)]">{user.email}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[color:rgba(142,162,175,0.72)]">
                            {user.analysisFocus} · {user.defaultAccountCurrency}
                          </div>
                        </div>
                      </div>
                      <span className={cn('shrink-0 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em]', badgeClass)}>
                        {statusLabel(user.locked, user.verified, user.status)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-auto flex items-center gap-3 border-t border-[color:var(--line)] pt-6">
              <div className="size-1.5 bg-[var(--accent)]" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Data feed active</span>
            </div>
          </div>
        </aside>

        <section className="relative flex items-center justify-center bg-[rgba(9,16,23,0.82)] px-6 py-10 md:px-10 xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,211,192,0.08),transparent_42%)]" />
          <div className="relative z-10 w-full max-w-[470px]">
            <div className="mb-10 lg:hidden">
              <Link className="font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--accent)]" to="/">
                Sovereign Analytics
              </Link>
            </div>

            <div className="mb-10">
              <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Secure login</div>
              <h2 className="font-display text-4xl font-semibold tracking-[-0.06em] text-[var(--text)] md:text-5xl">Continue to workspace</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">Use your account credentials to open the research terminal.</p>
            </div>

            <form className="space-y-6" onSubmit={submit}>
              <div className="space-y-5 border border-[color:var(--line)] bg-[var(--panel)] p-7 md:p-8">
                <label className="block space-y-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Email</span>
                  <input
                    autoComplete="email"
                    className="w-full border border-[color:var(--line)] bg-[var(--panel-4)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[color:rgba(142,162,175,0.45)] focus:border-[var(--accent)]"
                    placeholder="name@sovereignanalytics.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center justify-between gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    <span>Password</span>
                    <Link className="text-[var(--accent)] transition hover:text-[var(--accent-2)]" to="/forgot-password">
                      Forgot
                    </Link>
                  </span>
                  <input
                    autoComplete="current-password"
                    className="w-full border border-[color:var(--line)] bg-[var(--panel-4)] px-4 py-3.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[color:rgba(142,162,175,0.45)] focus:border-[var(--accent)]"
                    placeholder="Enter your password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                {error ? <div className="border border-[rgba(227,128,120,0.3)] bg-[rgba(227,128,120,0.12)] px-4 py-3 text-sm text-[#f4c2bd]">{error}</div> : null}

                <div className="space-y-3 pt-2">
                  <button
                    className="machined-gradient inline-flex w-full items-center justify-center px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#062b27] transition hover:brightness-110 active:scale-[0.99]"
                    type="submit"
                  >
                    Sign in
                  </button>
                  <Link
                    className="inline-flex w-full items-center justify-center border border-[color:rgba(105,211,192,0.55)] px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--accent)] transition hover:bg-[rgba(105,211,192,0.08)]"
                    to="/signup"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </form>

            <div className="mt-10">
              <div className="mb-5 flex items-center gap-4">
                <div className="h-px flex-1 bg-[color:var(--line)]" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Quick access</span>
                <div className="h-px flex-1 bg-[color:var(--line)]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickAccessUsers.map((user) => (
                  <button
                    className="flex items-center justify-between border border-[color:var(--line)] bg-[var(--panel-4)] px-4 py-3 transition hover:border-[color:rgba(105,211,192,0.45)] hover:bg-[var(--panel-2)]"
                    key={user.id}
                    onClick={() => {
                      setEmail(user.email)
                      setPassword(user.password)
                      setError('')
                    }}
                    type="button"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text)]">{user.displayName.split(' ')[0]}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{user.analysisFocus}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-14 text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:rgba(142,162,175,0.68)]">Session routing and verification rules apply after sign-in.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export const SignupPage = () => {
  const navigate = useNavigate()
  const { refreshUser } = useAppState()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <AuthWorkspace
      description="Create a workspace account and continue into onboarding."
      eyebrow="Registration"
      formDescription="Name, email, password"
      formTitle="Create account"
      form={
        <form
          className="space-y-6"
          onSubmit={async (event) => {
            event.preventDefault()
            try {
              await authApi.signup({ displayName, email, password })
              await refreshUser()
              navigate('/verify')
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Unable to create account.')
            }
          }}
        >
          <div className="grid gap-4">
            <AuthField label="Display name">
              <AuthInput autoComplete="name" placeholder="Amina Research" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </AuthField>
            <AuthField label="Email">
              <AuthInput autoComplete="email" placeholder="name@sovereignanalytics.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </AuthField>
            <AuthField label="Password">
              <AuthInput autoComplete="new-password" placeholder="Create a password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </AuthField>
          </div>
          {error ? <div className="rounded-[4px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          <AuthButton type="submit">Create account</AuthButton>
          <div className="flex items-center justify-between gap-4 text-sm text-[#9ea6b0]">
            <span>Already registered?</span>
            <Link className="font-semibold text-[#d8b574] transition hover:text-[#ecd7a6]" to="/login">
              Log in
            </Link>
          </div>
        </form>
      }
      sideChildren={
        <div className="grid gap-3 md:grid-cols-2">
          <AuthPanel body="Set favorites, risk profile, dashboard density, and default account currency." icon={<CandlestickChart className="size-4" />} title="Onboarding" />
          <AuthPanel body="Save alerts, notes, watchlists, and portfolio activity under your own workspace." icon={<BriefcaseBusiness className="size-4" />} title="Workspace" />
          <AuthPanel body="Verification stays in the flow before the platform opens." icon={<Shield className="size-4" />} title="Verification" />
          <AuthPanel body="Current market data and live news are available after sign-in." icon={<Radar className="size-4" />} title="Live data" />
        </div>
      }
      sideTitle="What Opens Next"
      title="CREATE A NEW ACCESS PROFILE"
    />
  )
}

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <AuthWorkspace
      description="Send a reset link to the account email."
      eyebrow="Recovery"
      formDescription="Account email"
      formTitle="Reset password"
      form={
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/reset-success')
          }}
        >
          <AuthField label="Email">
            <AuthInput autoComplete="email" placeholder="name@sovereignanalytics.com" />
          </AuthField>
          <AuthButton type="submit">Send reset link</AuthButton>
          <div className="flex items-center justify-between gap-4 text-sm text-[#9ea6b0]">
            <span>Remembered your password?</span>
            <Link className="font-semibold text-[#d8b574] transition hover:text-[#ecd7a6]" to="/login">
              Back to login
            </Link>
          </div>
        </form>
      }
      sideChildren={
        <div className="grid gap-3">
          <AuthPanel body="Request a reset link." icon={<KeyRound className="size-4" />} title="01" />
          <AuthPanel body="Open the link and confirm your account." icon={<Shield className="size-4" />} title="02" />
          <AuthPanel body="Return to the platform and continue." icon={<CheckCircle2 className="size-4" />} title="03" />
        </div>
      }
      sideTitle="Recovery Steps"
      title="RECOVER ACCOUNT ACCESS"
    />
  )
}

export const ResetSuccessPage = () => (
  <AuthWorkspace
    description="Reset instructions have been issued."
    eyebrow="Recovery Complete"
    formDescription="Password reset"
    formTitle="Check your inbox"
    form={
      <div className="space-y-6">
        <div className="rounded-[4px] border border-[rgba(118,117,120,0.18)] bg-[#111316] px-4 py-4 text-sm text-[#aab1bb]">
          A reset link has been generated for this environment.
        </div>
        <AuthLinkButton to="/login">Return to login</AuthLinkButton>
      </div>
    }
    sideChildren={
        <div className="grid gap-3 md:grid-cols-2">
          <AuthPanel body="Use the same email on the login screen once the reset is complete." icon={<Mail className="size-4" />} title="Return path" />
          <AuthPanel body="Session routing stays intact after recovery." icon={<ArrowRight className="size-4" />} title="Continue" />
        </div>
    }
    sideTitle="Next Step"
    title="RESET REQUEST ACCEPTED"
  />
)

export const VerifyPage = () => {
  const navigate = useNavigate()
  const { refreshUser, user } = useAppState()
  return (
    <AuthWorkspace
      description="Validate the current session and continue."
      eyebrow="Verification"
      formDescription="One-time code"
      formTitle="Verify session"
      form={
        <div className="space-y-6">
          <div className="rounded-[4px] border border-[rgba(216,181,116,0.18)] bg-[rgba(216,181,116,0.08)] px-4 py-4 text-sm text-[#efe2be]">
            Verification code: <span className="font-semibold tracking-[0.24em]">241913</span>
          </div>
          <AuthButton
            onClick={async () => {
              await authApi.verifyOtp()
              await refreshUser()
              const nextUser = appApi.getCurrentUser()
              navigate(nextUser?.onboardingCompleted ? '/app/dashboard' : '/onboarding')
            }}
            type="button"
          >
            Validate session
          </AuthButton>
        </div>
      }
      sideChildren={
        <div className="grid gap-3">
          <AuthPanel body={user?.email ?? 'Current session'} icon={<Shield className="size-4" />} title="Identity" />
          <AuthPanel body={user?.onboardingCompleted ? 'Dashboard is next.' : 'Onboarding is next.'} icon={<ArrowRight className="size-4" />} title="Route" />
        </div>
      }
      sideTitle="Session State"
      title="CONFIRM CURRENT SESSION"
    />
  )
}

export const ProtectedRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAppState()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/login" />
  if (!user.verified || user.status === 'unverified') return <Navigate replace to="/verify" />
  if (!user.onboardingCompleted && location.pathname !== '/onboarding') return <Navigate replace to="/onboarding" />
  return <>{children}</>
}
