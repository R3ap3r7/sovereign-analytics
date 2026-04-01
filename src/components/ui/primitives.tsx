import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

export const Page = ({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Sovereign Analytics</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    {children}
  </div>
)

export const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('rounded-3xl border border-[var(--line)] bg-[color:var(--panel)]/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur', className)}>{children}</div>
)

export const SectionTitle = ({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div>
      {eyebrow ? <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</div> : null}
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
    </div>
    {detail ? <div className="max-w-md text-right text-xs leading-5 text-[var(--muted)]">{detail}</div> : null}
  </div>
)

export const Badge = ({ tone = 'default', children }: { tone?: 'default' | 'accent' | 'warning' | 'danger'; children: React.ReactNode }) => {
  const styles = {
    default: 'border-[var(--line)] bg-white/5 text-[var(--text)]',
    accent: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    warning: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    danger: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
  }
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]', styles[tone])}>{children}</span>
}

export const Stat = ({ label, value, help, tone }: { label: string; value: React.ReactNode; help?: string; tone?: 'up' | 'down' | 'flat' }) => (
  <div className="rounded-2xl border border-[var(--line)] bg-[color:var(--panel-2)]/70 p-4">
    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
    <div className={cn('mt-2 text-2xl font-semibold', tone === 'up' && 'text-emerald-200', tone === 'down' && 'text-rose-200')}>{value}</div>
    {help ? <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{help}</div> : null}
  </div>
)

export const ActionLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link className="inline-flex items-center rounded-full border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]" to={to}>
    {children}
  </Link>
)

export const LoadingPanel = ({ label = 'Loading workspace…' }: { label?: string }) => <Panel className="animate-pulse text-sm text-[var(--muted)]">{label}</Panel>
