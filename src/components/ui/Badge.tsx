import { type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--surface2)',
    color: 'var(--muted2)',
    border: '1px solid var(--border)',
  },
  success: {
    backgroundColor: 'transparent',
    color: 'var(--success)',
    border: '1px solid var(--success)',
  },
  warning: {
    backgroundColor: 'transparent',
    color: 'var(--warning)',
    border: '1px solid var(--warning)',
  },
  danger: {
    backgroundColor: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
  },
  accent: {
    backgroundColor: 'var(--accent-dim)',
    color: 'var(--accent)',
    border: '1px solid transparent',
  },
}

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        className,
      )}
      style={{
        ...VARIANT_STYLES[variant],
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </span>
  )
}