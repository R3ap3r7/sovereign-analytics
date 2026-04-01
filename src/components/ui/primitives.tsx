import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

export const Page = ({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-6">
    <div className="terminal-grid overflow-hidden rounded-[4px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-5 py-4 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.04em] text-[var(--text)] lg:text-[2.15rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
    {children}
  </div>
)

export const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={cn(
      'overflow-hidden rounded-[4px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] bg-[color:var(--panel)] p-4 shadow-[var(--shadow)] backdrop-blur',
      className,
    )}
  >
    {children}
  </div>
)

export const SectionTitle = ({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div>
      {eyebrow ? <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{eyebrow}</div> : null}
      <h2 className="font-display mt-1 text-[1.05rem] font-semibold tracking-[-0.02em]">{title}</h2>
    </div>
    {detail ? <div className="max-w-md text-right text-xs leading-5 text-[var(--muted)]">{detail}</div> : null}
  </div>
)

export const Badge = ({ tone = 'default', children }: { tone?: 'default' | 'accent' | 'warning' | 'danger'; children: React.ReactNode }) => {
  const styles = {
    default: 'border-[var(--line)] bg-white/[0.03] text-[var(--text)]',
    accent: 'border-[rgba(105,211,192,0.24)] bg-[rgba(105,211,192,0.1)] text-[var(--accent)]',
    warning: 'border-[rgba(224,180,108,0.24)] bg-[rgba(224,180,108,0.1)] text-[var(--warning)]',
    danger: 'border-[rgba(227,128,120,0.24)] bg-[rgba(227,128,120,0.1)] text-[var(--danger)]',
  }
  return <span className={cn('font-mono inline-flex items-center rounded-[2px] border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]', styles[tone])}>{children}</span>
}

export const Stat = ({ label, value, help, tone }: { label: string; value: React.ReactNode; help?: string; tone?: 'up' | 'down' | 'flat' }) => (
  <div className="rounded-[3px] border border-[var(--line)] bg-[color:var(--panel-2)]/78 p-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
    <div className={cn('font-display mt-3 text-2xl font-semibold tracking-[-0.03em]', tone === 'up' && 'text-[var(--success)]', tone === 'down' && 'text-[var(--danger)]')}>{value}</div>
    {help ? <div className="mt-2 text-xs leading-5 text-[var(--muted)]">{help}</div> : null}
  </div>
)

export const ActionLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link className="font-mono inline-flex items-center rounded-[2px] border border-[var(--line)] bg-[color:var(--panel-2)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text)] transition hover:border-[rgba(105,211,192,0.45)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]" to={to}>
    {children}
  </Link>
)

export const LoadingPanel = ({ label = 'Loading workspace…' }: { label?: string }) => <Panel className="animate-pulse text-sm text-[var(--muted)]">{label}</Panel>
