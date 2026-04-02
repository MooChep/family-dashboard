import type { ReactNode, ReactElement } from 'react'
import { GamelleBottomNav } from '@/components/layout/GamelleBottomNav'

/**
 * Layout module Gamelle — annule le padding de PageWrapper pour un layout full-bleed,
 * et ajoute le padding bas pour la bottom nav mobile (64px).
 * Le header fixe global est déjà compensé par le spacer du dashboard layout.
 */
export default function GamelleLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      <div
        className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 pb-16"
        style={{ minHeight: 'calc(100vh - 3.5rem - env(safe-area-inset-top))' }}
      >
        {children}
      </div>
      <GamelleBottomNav />
    </>
  )
}
