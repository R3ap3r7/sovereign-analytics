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
      'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition',
      secondary
        ? 'border border-[var(--line)] bg-transparent text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        : 'bg-[var(--accent)] text-[#0f1311] hover:brightness-105',
      className,
    )}
  />
)

export const ButtonLink = ({ to, children, secondary }: { to: string; children: React.ReactNode; secondary?: boolean }) => (
  <Link
    className={cn(
      'inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition',
      secondary
        ? 'border border-[var(--line)] bg-transparent text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
        : 'bg-[var(--accent)] text-[#0f1311] hover:brightness-105',
    )}
    to={to}
  >
    {children}
  </Link>
)
