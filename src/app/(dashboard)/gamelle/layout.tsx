import type { ReactNode, ReactElement } from 'react'
import { GamelleBottomNav } from '@/components/layout/GamelleBottomNav'

/**
 * Layout module Gamelle — ajoute la bottom nav 4 onglets sur mobile
 * et un padding bas pour que le contenu ne soit pas masqué par la nav.
 */
export default function GamelleLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      <div className="pb-16">
        {children}
      </div>
      <GamelleBottomNav />
    </>
  )
}
