'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Dashboard', href: '/epargne' },
  { label: 'Mois',      href: '/epargne/mois' },
  { label: 'Analyses',  href: '/epargne/analyses' },
  { label: 'Catégories',href: '/epargne/categories' },
]

interface EpargneLayoutProps {
  children: ReactNode
  // Slot optionnel pour injecter un élément sticky sous les onglets
  // (ex: le sélecteur de mois dans la page Mois)
  stickySubHeader?: ReactNode
}

export function EpargneLayout({
  children,
  stickySubHeader,
}: EpargneLayoutProps): ReactElement {
  const pathname = usePathname()
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabsHeight, setTabsHeight] = useState(0)

  // Mesure la hauteur réelle du bloc onglets après le rendu
  useEffect(() => {
    if (!tabsRef.current) return
    const observer = new ResizeObserver((entries) => {
      setTabsHeight(entries[0]?.contentRect.height ?? 0)
    })
    observer.observe(tabsRef.current)
    return () => observer.disconnect()
  }, [])

  const HEADER_HEIGHT = 64 // hauteur du Header Phase 1

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Onglets sticky ───────────────────────────────────────────── */}
      <div
        ref={tabsRef}
        className="sticky z-20 -mx-6 px-6 py-3"
        style={{
          top: `${HEADER_HEIGHT}px`,
          backgroundColor: 'var(--bg)',
          borderBottom: stickySubHeader ? 'none' : '1px solid var(--border)',
        }}
      >
        <div
          className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          {TABS.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                )}
                style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--text2)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* ─── Sous-header sticky optionnel (ex: sélecteur de mois) ────── */}
      {stickySubHeader && (
        <div
          className="sticky z-10 -mx-6 px-6 py-3"
          style={{
            // Se colle exactement sous les onglets
            top: `${HEADER_HEIGHT + tabsHeight + 24}px`,
            backgroundColor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {stickySubHeader}
        </div>
      )}

      {/* ─── Contenu ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  )
}