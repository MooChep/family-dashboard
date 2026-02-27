import { type ReactNode, type HTMLAttributes, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  // "flush" supprime le padding interne pour les cartes avec du contenu plein-largeur
  flush?: boolean
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

interface CardSectionProps {
  children: ReactNode
  className?: string
}

export function Card({
  children,
  flush = false,
  className,
  ...props
}: CardProps): ReactElement {
  return (
    <div
      className={cn('rounded-xl', className)}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      {...props}
    >
      <div className={cn(!flush && 'p-5')}>
        {children}
      </div>
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: CardHeaderProps): ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2
          className="text-base font-semibold"
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardSection({
  children,
  className,
}: CardSectionProps): ReactElement {
  return (
    <div
      className={cn('px-5 py-4', className)}
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}