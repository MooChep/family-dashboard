import { type ButtonHTMLAttributes, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'discrete'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent)',
    color: 'var(--bg)',
    border: '1px solid transparent',
  },
  secondary: {
    backgroundColor: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text2)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
  },
  discrete: {
    backgroundColor: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
  },
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      disabled={disabled ?? isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-opacity cursor-pointer',
        SIZE_CLASSES[size],
        (disabled ?? isLoading) && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{
        ...VARIANT_STYLES[variant],
        fontFamily: 'var(--font-body)',
      }}
      {...props}
    >
      {isLoading && (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}