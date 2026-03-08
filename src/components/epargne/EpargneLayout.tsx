'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Dashboard', href: '/epargne' },
  { label: 'Mois',      href: '/epargne/mois' },
  { label: 'Analyses',  href: '/epargne/analyses' },
  { label: 'Régul',     href: '/epargne/regul' },
  { label: 'Gestion',   href: '/epargne/gestion' },
]

interface EpargneLayoutProps {
  children: ReactNode
  stickySubHeader?: ReactNode
}

export function EpargneLayout({ children, stickySubHeader }: EpargneLayoutProps): ReactElement {
  const pathname = usePathname()
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabsHeight, setTabsHeight] = useState(0)

  useEffect(() => {
    if (!tabsRef.current) return
    const observer = new ResizeObserver((entries) => {
      setTabsHeight(entries[0]?.contentRect.height ?? 0)
    })
    observer.observe(tabsRef.current)
    return () => observer.disconnect()
  }, [])

  const HEADER_HEIGHT = 64

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div
        ref={tabsRef}
        className="sticky z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-3 border-b border-[var(--border)] md:border-none"
        style={{ 
          top: `${HEADER_HEIGHT}px`, 
          backgroundColor: 'var(--bg)',
          borderBottom: stickySubHeader ? 'none' : undefined 
        }}
      >
        {/* Conteneur de tabs scrollable sur mobile */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-1 p-1 rounded-xl w-max md:w-fit bg-[var(--surface)]">
            {TABS.map((tab) => {
              const isActive = tab.href === '/epargne' ? pathname === tab.href : pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--text2)] hover:text-[var(--text)]'
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {stickySubHeader && (
        <div
          className="sticky z-10 -mx-4 px-4 md:-mx-6 md:px-6 py-3 border-b border-[var(--border)]"
          style={{ 
            top: `${HEADER_HEIGHT + tabsHeight}px`, 
            backgroundColor: 'var(--bg)' 
          }}
        >
          {stickySubHeader}
        </div>
      )}

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}