import { type ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  // "shimmer" active l'animation de balayage lumineux
  shimmer?: boolean
}

// Skeleton de base — rectangle animé qui simule du contenu en chargement
export function Skeleton({
  className,
  shimmer = true,
}: SkeletonProps): ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg',
        shimmer && 'animate-pulse',
        className,
      )}
      style={{ backgroundColor: 'var(--surface2)' }}
      aria-hidden="true"
    />
  )
}

// Skeleton d'une ligne de texte
export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number
  className?: string
}): ReactElement {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          // style={{
          //   // La dernière ligne est plus courte pour simuler une fin de paragraphe
          //   width: i === lines - 1 && lines > 1 ? '60%' : '100%',
          // } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// Skeleton d'une card complète avec header et contenu
export function SkeletonCard(): ReactElement {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      {/* Contenu */}
      <SkeletonText lines={3} />
      {/* Action */}
      <Skeleton className="h-9 w-24" />
    </div>
  )
}

// Skeleton d'une ligne de tableau
export function SkeletonTableRow({
  columns = 4,
}: {
  columns?: number
}): ReactElement {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1"
        />
      ))}
    </div>
  )
}