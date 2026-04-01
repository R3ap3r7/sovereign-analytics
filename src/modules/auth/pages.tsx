import { ArrowRight, Terminal } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { authApi, getSeed } from '../../domain/services/mockApi'
import { ButtonLink, PrimaryButton } from '../shared'

const AuthInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-[2px] border border-[rgba(176,202,215,0.16)] bg-[rgba(8,12,16,0.9)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[rgba(139,196,168,0.65)] focus:ring-2 focus:ring-[rgba(139,196,168,0.12)]"
  />
)

const DemoRow = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-[2px] border border-[rgba(176,202,215,0.12)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm text-[var(--text)]">{value}</div>
    </div>
    {href ? <Link className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]" to={href}>Open</Link> : null}
  </div>
)

const AuthWorkspace = ({
  eyebrow,
  title,
  description,
  form,
  sideTitle,
  sideChildren,
}: {
  eyebrow: string
  title: string
  description: string
  form: React.ReactNode
  sideTitle: string
  sideChildren: React.ReactNode
}) => (
  <div className="min-h-screen overflow-x-hidden bg-[#131313]">
    <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-[rgba(61,73,70,0.2)] bg-[#131313] px-4 py-4 lg:px-6">
      <Link className="flex items-center gap-2" to="/">
        <Terminal className="size-5 text-[#70d8c8]" />
        <span className="font-display text-lg font-bold tracking-[-0.04em] text-[#70d8c8] lg:text-xl">SOVEREIGN ANALYTICS</span>
      </Link>
      <Link className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#b1cad7] transition hover:text-[#70d8c8]" to="/">
        Back to overview
      </Link>
    </header>

    <main className="grid min-h-[calc(100vh-69px)] lg:grid-cols-[0.92fr_1.08fr]">
      <section className="border-b border-[rgba(61,73,70,0.12)] bg-[#131313] p-6 lg:border-b-0 lg:border-r lg:p-10">
        <div className="max-w-xl space-y-6">
          <div className="space-y-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#bcc9c5]">{eyebrow}</div>
            <h1 className="font-display text-5xl font-bold uppercase leading-[0.92] tracking-[-0.08em] text-[#e5e2e1] lg:text-[5.4rem]">
              {title}
            </h1>
            <p className="max-w-lg text-sm leading-7 text-[#b1cad7]">{description}</p>
          </div>
          {form}
        </div>
      </section>

      <aside className="bg-[#0e0e0e] p-6 lg:p-10">
        <div className="space-y-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#bcc9c5]">{sideTitle}</div>
          {sideChildren}
        </div>
      </aside>
    </main>
  </div>
)

const AuthPanel = ({ title, body }: { title: string; body: string }) => (
  <div className="bg-[#1c1b1b] p-5">
    <div className="font-display text-lg font-bold uppercase tracking-[-0.03em] text-[#e5e2e1]">{title}</div>
    <div className="mt-2 text-sm leading-7 text-[#b1cad7]">{body}</div>
  </div>
)

const PersonaList = () => {
  const personas = getSeed().users.slice(0, 6).map((user) => ({
    name: user.displayName,
    status: user.locked ? 'Locked' : !user.verified || user.status === 'unverified' ? 'Verification needed' : 'Ready',
    detail: `${user.analysisFocus} focus · ${user.defaultAccountCurrency} account`,
  }))

  return (
    <div className="space-y-px bg-[rgba(61,73,70,0.12)]">
      {personas.map((persona) => (
        <div className="flex items-start justify-between gap-4 bg-[#1c1b1b] p-4" key={persona.name}>
          <div>
            <div className="text-base font-semibold text-[#e5e2e1]">{persona.name}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#bcc9c5]">{persona.detail}</div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#70d8c8]">{persona.status}</div>
        </div>
      ))}
    </div>
  )
}

export const LandingPage = () => (
  (() => {
    const seed = getSeed()
    const highlights = [
      `Track ${seed.currencies.length} currency profiles with linked macro context and strength narratives.`,
      `Analyze ${seed.pairs.length} seeded FX pairs across events, technical structure, simulations, and forecasts.`,
      `Explore ${seed.events.length + seed.news.length}+ connected macro events and market stories across the platform.`,
    ]
    const modules = [
      {
        code: 'M_01',
        title: 'Market Overview',
        href: '/login',
        summary: 'Real-time visualization of mock liquidity flows, volatility buckets, strength rankings, and event risk across the shared market model.',
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
        title: 'Forecast Demo',
        href: '/login',
        summary: 'Inspect illustrative path bands and driver weighting objects derived from the same pair narratives used elsewhere.',
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
            Enter Demo
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
                  <span>ENTER DEMO TERMINAL</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </Link>
                <Link className="w-full border border-[rgba(61,73,70,0.3)] px-6 py-4 text-left font-display text-sm font-medium uppercase tracking-[0.14em] text-[#b1cad7] transition hover:bg-[#353534]" to="/signup">
                  CREATE MOCK ACCOUNT
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
              Demo data powers this experience. Live brokers, real-time market feeds, and production forecasting services are not connected in this build.
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
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bcc9c5]">How It Works</div>
              <div className="mt-3 text-sm leading-7 text-[#b1cad7]">
                Move from macro context into a pair, launch a prefilled simulation, save the scenario, then carry that context into watchlists, notes, and portfolio exposure.
              </div>
            </div>
            <div className="bg-[#1c1b1b] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#bcc9c5]">Shared Data Model</div>
              <div className="mt-3 text-sm leading-7 text-[#b1cad7]">
                The same seeded entities power currencies, pairs, events, forecasts, alerts, and personas, so the product stays structurally connected even without a backend.
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
  const [email, setEmail] = useState('macro@sovereign.demo')
  const [password, setPassword] = useState('macro123')
  const [error, setError] = useState('')
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
    <AuthWorkspace
      description="Use one of the seeded analyst accounts to enter the platform. Different personas carry different preferences, watchlists, simulations, and portfolio context."
      eyebrow="Identity"
      form={
        <>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4">
              <label className="space-y-2 text-sm text-[#bcc9c5]">
                <span>Email</span>
                <AuthInput autoComplete="email" placeholder="macro@sovereign.demo" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="space-y-2 text-sm text-[#bcc9c5]">
                <span>Password</span>
                <AuthInput autoComplete="current-password" placeholder="macro123" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            </div>
            {error ? <div className="rounded-[2px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
            <PrimaryButton className="w-full" type="submit">
              Continue to dashboard
            </PrimaryButton>
          </form>
          <div className="flex items-center justify-between text-sm text-[#b1cad7]">
            <Link className="transition hover:text-[#70d8c8]" to="/forgot-password">Forgot password</Link>
            <Link className="transition hover:text-[#70d8c8]" to="/signup">Create account</Link>
          </div>
        </>
      }
      sideChildren={
        <>
          <PersonaList />
          <div className="grid gap-px bg-[rgba(61,73,70,0.12)] md:grid-cols-2">
            <AuthPanel title="Saved State" body="Persona changes affect favorite pairs, layout density, notes, watchlists, and current portfolio context across the app." />
            <AuthPanel title="Session Return" body="Protected routes return you to the intended screen after authentication or verification so flows stay connected." />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DemoRow label="Recovery" value="Forgot password" href="/forgot-password" />
            <DemoRow label="Registration" value="Create mock account" href="/signup" />
          </div>
        </>
      }
      sideTitle="Analyst Personas"
      title="Access Terminal"
    />
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
      description="Create a new local account profile for the platform. After verification, onboarding will set dashboard defaults, risk preferences, favorite currencies, and simulation behavior."
      eyebrow="Registration"
      form={
        <form
          className="space-y-4"
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
            <label className="space-y-2 text-sm text-[#bcc9c5]">
              <span>Display name</span>
              <AuthInput autoComplete="name" placeholder="Amina Research" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-[#bcc9c5]">
              <span>Email</span>
              <AuthInput autoComplete="email" placeholder="analyst@sovereign.demo" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-[#bcc9c5]">
              <span>Password</span>
              <AuthInput autoComplete="new-password" placeholder="Create a password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          </div>
          {error ? <div className="rounded-[2px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          <PrimaryButton className="w-full" type="submit">
            Create account
          </PrimaryButton>
        </form>
      }
      sideChildren={
        <div className="grid gap-px bg-[rgba(61,73,70,0.12)]">
          <AuthPanel title="Onboarding Ready" body="New accounts flow directly into onboarding so preferred currencies, dashboard style, and analysis focus shape the workspace from the first session." />
          <AuthPanel title="Local Persistence" body="Session state, notes, simulations, watchlist changes, alerts, and profile preferences remain available in the browser for continued exploration." />
          <AuthPanel title="Verification Step" body="New accounts still pass through verification so the product keeps a realistic route flow before entering the main application." />
        </div>
      }
      sideTitle="Account Setup"
      title="Create Account"
    />
  )
}

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <AuthWorkspace
      description="Recover access to the platform by simulating an email-based reset flow. This stays local to the product shell but preserves the same route behavior as a real app."
      eyebrow="Recovery"
      form={
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/reset-success')
          }}
        >
          <label className="space-y-2 text-sm text-[#bcc9c5]">
            <span>Email</span>
            <AuthInput autoComplete="email" placeholder="name@sovereign.demo" />
          </label>
          <PrimaryButton className="w-full" type="submit">
            Send reset link
          </PrimaryButton>
        </form>
      }
      sideChildren={
        <div className="grid gap-px bg-[rgba(61,73,70,0.12)]">
          <AuthPanel title="Reset Flow" body="This route mirrors a standard password recovery path so the platform remains complete even though no external email provider is connected." />
          <AuthPanel title="Return Path" body="After confirmation, the flow hands you back to the login screen so you can continue with the same intended destination." />
        </div>
      }
      sideTitle="Access Recovery"
      title="Reset Access"
    />
  )
}

export const ResetSuccessPage = () => (
  <AuthWorkspace
    description="The recovery request has been accepted. In a production build this step would hand off to email delivery; here it confirms the route flow and returns you to sign-in."
    eyebrow="Recovery Complete"
    form={<ButtonLink to="/login">Return to login</ButtonLink>}
    sideChildren={
      <div className="grid gap-px bg-[rgba(61,73,70,0.12)]">
        <AuthPanel title="Next Step" body="Return to the login screen and continue with one of the seeded analysts or your newly created account." />
      </div>
    }
    sideTitle="Password Reset"
    title="Request Accepted"
  />
)

export const VerifyPage = () => {
  const navigate = useNavigate()
  const { refreshUser } = useAppState()
  return (
    <AuthWorkspace
      description="Verification completes access for unverified or multi-factor-enabled personas before the platform opens onboarding or the main application shell."
      eyebrow="Verification"
      form={
        <>
          <div className="rounded-[2px] border border-[rgba(176,202,215,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[#b1cad7]">Verification code: `241913`</div>
          <PrimaryButton
            className="w-full"
            onClick={async () => {
              await authApi.verifyOtp()
              await refreshUser()
              navigate('/onboarding')
            }}
            type="button"
          >
            Validate session
          </PrimaryButton>
        </>
      }
      sideChildren={
        <div className="grid gap-px bg-[rgba(61,73,70,0.12)]">
          <AuthPanel title="Protected Entry" body="Verification keeps the route flow realistic for accounts that require confirmation before entering the product workspace." />
          <AuthPanel title="Continuation" body="Once validated, the flow continues into onboarding for new users or into the main application for returning personas." />
        </div>
      }
      sideTitle="Session Verification"
      title="Verify Access"
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
