import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { authApi } from '../../domain/services/mockApi'
import { ButtonLink, PrimaryButton } from '../shared'

const AuthCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-[color:var(--panel)]/92 p-8 shadow-2xl">
    <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Forex research shell</div>
    <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
    <div className="mt-6 space-y-4">{children}</div>
  </div>
)

const AuthInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]" />
)

export const LandingPage = () => (
  <div className="min-h-screen px-6 py-8">
    <div className="mx-auto max-w-7xl">
      <div className="rounded-[2rem] border border-[var(--line)] bg-[color:var(--panel)]/88 p-8 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Mock-data forex analytics environment</div>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight lg:text-7xl">
              Sovereign Analytics turns currencies, macro events, simulations, and paper portfolio risk into one connected workspace.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)]">
              Explore country and currency intelligence, inspect pair-level macro and technical context, test leverage and scenario outcomes, and track exposure through a portfolio-style mock account. The environment is front-end only and uses seeded demo data throughout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/login">Enter demo accounts</ButtonLink>
              <ButtonLink secondary to="/signup">
                Create mock account
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ['Market overview', 'Rank currency strength, compare event risk, and move directly into watched pairs.'],
              ['Pair analysis', 'Blend trend structure, macro differential, event exposure, forecast bands, notes, and saved scenarios in one pair workspace.'],
              ['Simulation tools', 'Model capital, leverage, stop width, take-profit, margin usage, pip value, and scenario stress under consistent assumptions.'],
              ['Virtual portfolio', 'Keep paper positions, journal context, concentration metrics, and links back to the originating pair or simulation.'],
            ].map(([title, text]) => (
              <div className="rounded-3xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-5" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
              </div>
            ))}
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/8 p-5 text-sm leading-6 text-amber-100">
              This product shell uses mock data only. No live broker, forecasting engine, backend, or real-money trading connection is implemented.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AuthCard title="Login to the demo terminal" subtitle="Use any seeded persona to explore a different market perspective.">
        <form className="space-y-4" onSubmit={submit}>
          <AuthInput autoComplete="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <AuthInput autoComplete="current-password" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          <PrimaryButton className="w-full" type="submit">
            Continue
          </PrimaryButton>
        </form>
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4 text-sm text-[var(--muted)]">
          Demo personas:
          <div className="mt-2 space-y-1 text-xs">
            <div>`macro@sovereign.demo / macro123`</div>
            <div>`simlab@sovereign.demo / sim123`</div>
            <div>`portfolio@sovereign.demo / book123`</div>
            <div>`admin@sovereign.demo / admin123`</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <Link to="/forgot-password">Forgot password</Link>
          <Link to="/signup">Create account</Link>
        </div>
      </AuthCard>
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
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AuthCard title="Create a mock account" subtitle="This creates a local-only user state with seeded starter preferences.">
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
          <AuthInput autoComplete="name" placeholder="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <AuthInput autoComplete="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <AuthInput autoComplete="new-password" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <div className="text-sm text-rose-200">{error}</div> : null}
          <PrimaryButton className="w-full" type="submit">
            Create account
          </PrimaryButton>
        </form>
      </AuthCard>
    </div>
  )
}

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AuthCard title="Reset mock password" subtitle="This flow is simulated to demonstrate a realistic recovery path.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/reset-success')
          }}
        >
          <AuthInput autoComplete="email" placeholder="Email" />
          <PrimaryButton className="w-full" type="submit">
            Send reset link
          </PrimaryButton>
        </form>
      </AuthCard>
    </div>
  )
}

export const ResetSuccessPage = () => (
  <div className="flex min-h-screen items-center justify-center px-6 py-10">
    <AuthCard title="Reset link simulated" subtitle="In the real product this would hand off to email. Here it simply confirms the product flow.">
      <ButtonLink to="/login">Return to login</ButtonLink>
    </AuthCard>
  </div>
)

export const VerifyPage = () => {
  const navigate = useNavigate()
  const { refreshUser } = useAppState()
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <AuthCard title="Verify demo session" subtitle="Use the mock OTP step to complete unverified or 2FA-enabled personas.">
        <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 px-4 py-3 text-sm text-[var(--muted)]">Mock OTP: `241913`</div>
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
      </AuthCard>
    </div>
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
