import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'

export const PrimaryButton = ({
  className,
  secondary,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) => (
  <button
    {...props}
    className={cn(
      'font-mono inline-flex items-center justify-center rounded-[2px] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] transition',
      secondary
        ? 'border border-[var(--line)] bg-[color:var(--panel-2)] text-[var(--text)] hover:border-[rgba(105,211,192,0.5)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'
        : 'bg-[linear-gradient(135deg,var(--accent-strong),var(--accent))] text-[#071014] hover:brightness-105',
      className,
    )}
  />
)

export const ButtonLink = ({ to, children, secondary }: { to: string; children: React.ReactNode; secondary?: boolean }) => (
  <Link
    className={cn(
      'font-mono inline-flex items-center justify-center rounded-[2px] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] transition',
      secondary
        ? 'border border-[var(--line)] bg-[color:var(--panel-2)] text-[var(--text)] hover:border-[rgba(105,211,192,0.5)] hover:bg-[color:var(--panel-3)] hover:text-[var(--accent)]'
        : 'bg-[linear-gradient(135deg,var(--accent-strong),var(--accent))] text-[#071014] hover:brightness-105',
    )}
    to={to}
  >
    {children}
  </Link>
)
