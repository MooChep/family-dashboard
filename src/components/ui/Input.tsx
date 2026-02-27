import { forwardRef, type InputHTMLAttributes, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

// forwardRef permet de passer une ref au vrai <input> depuis le composant parent
// utile pour les focus programmatiques et les librairies de formulaire
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, error, hint, className, id, ...props },
    ref,
  ): ReactElement {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium"
            style={{
              color: 'var(--text2)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors',
            className,
          )}
          style={{
            backgroundColor: 'var(--surface2)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--danger)'
              : 'var(--accent)'
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--danger)'
              : 'var(--border)'
            props.onBlur?.(e)
          }}
          {...props}
        />

        {error && (
          <span
            className="text-xs"
            style={{ color: 'var(--danger)' }}
          >
            {error}
          </span>
        )}

        {hint && !error && (
          <span
            className="text-xs"
            style={{ color: 'var(--muted)' }}
          >
            {hint}
          </span>
        )}
      </div>
    )
  },
)