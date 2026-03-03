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
    const ro = new ResizeObserver((entries) => setTabsH(entries[0]?.contentRect.height ?? 0))
    ro.observe(tabsRef.current)
    return () => ro.disconnect()
  }, [])

  const HEADER_H = 64

  return (
    <div className="flex flex-col gap-6">
      {/* Onglets analyses */}
      <div
        ref={tabsRef}
        className="sticky z-20 -mx-6 px-6 py-3"
        style={{
          top: `${HEADER_H}px`,
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
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors')}
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

      {/* Sous-header sticky (filtre période) */}
      {subHeader && (
        <div
          className="sticky z-10 -mx-6 px-6 py-3"
          style={{
            top: `${HEADER_H + tabsH}px`,
            backgroundColor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {subHeader}
        </div>
      )}

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}