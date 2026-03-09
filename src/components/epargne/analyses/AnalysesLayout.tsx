'use client'

import { useRef, useEffect, useState, type ReactNode, type ReactElement } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Épargne',   href: '/epargne/analyses' },
  { label: 'Dépenses',  href: '/epargne/analyses/depenses' },
  { label: 'Global',    href: '/epargne/analyses/global' },
  { label: 'Tags',      href: '/epargne/analyses/tags' },
]

interface AnalysesLayoutProps {
  children: ReactNode
  subHeader?: ReactNode
}

export function AnalysesLayout({ children, subHeader }: AnalysesLayoutProps): ReactElement {
  const pathname  = usePathname()
  const tabsRef   = useRef<HTMLDivElement>(null)
  const [tabsH, setTabsH] = useState(0)

  useEffect(() => {
    if (!tabsRef.current) return
    const ro = new ResizeObserver((entries) => {
      // On utilise offsetHeight pour inclure le padding et les bordures
      for (let entry of entries) {
        setTabsH(tabsRef.current?.offsetHeight ?? 0)
      }
    })
    ro.observe(tabsRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-0">
      {/* Onglets analyses - Barre 1 */}
      <div
        ref={tabsRef}
        className="sticky z-20 -mx-6 px-6 py-2"
        style={{
          top: 0,
          backgroundColor: 'var(--bg)',
          borderBottom: subHeader ? 'none' : '1px solid var(--border)',
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
                className={cn('px-4 py-1.5 rounded-lg text-sm font-bold transition-colors')}
                style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  // Correction : on force le texte en blanc/clair si actif sur fond sombre
                  color: isActive ? 'white' : 'var(--text2)',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sous-header sticky (filtre période) - Barre 2 */}
      {subHeader && (
        <div
          className="sticky z-10 -mx-6 px-6 py-3"
          style={{
            // C'est ici que la magie opère : décalage de la hauteur des tabs
            top: `${tabsH}px`,
            backgroundColor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {subHeader}
        </div>
      )}

      <div className="flex flex-col gap-6 pt-4">{children}</div>
    </div>
  )
}