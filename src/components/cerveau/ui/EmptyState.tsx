'use client'

import { type ReactElement, type ReactNode } from 'react'

interface EmptyStateProps {
  icon:    ReactNode
  message: string
}

/** État vide d'une section ou d'une vue liste. */
export function EmptyState({ icon, message }: EmptyStateProps): ReactElement {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', margin: 0 }}>{message}</p>
    </div>
  )
}
