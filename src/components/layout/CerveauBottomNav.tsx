'use client'

import { Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Rss, Search, LayoutGrid, CheckSquare, Bell, List,
  FolderOpen, MessageCircle, Calendar,
} from 'lucide-react'

interface NavItem {
  id: string
  icon: React.ElementType
  href: string | null
  isFilter: boolean
  isSearch: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'flux',       icon: Rss,           href: '/cerveau', isFilter: false, isSearch: false },
  { id: 'search',     icon: Search,        href: null,       isFilter: false, isSearch: true  },
  { id: 'ALL',        icon: LayoutGrid,    href: null,       isFilter: true,  isSearch: false },
  { id: 'TODO',       icon: CheckSquare,   href: null,       isFilter: true,  isSearch: false },
  { id: 'REMINDER',   icon: Bell,          href: null,       isFilter: true,  isSearch: false },
  { id: 'LIST',       icon: List,          href: null,       isFilter: true,  isSearch: false },
  { id: 'PROJECT',    icon: FolderOpen,    href: null,       isFilter: true,  isSearch: false },
  { id: 'DISCUSSION', icon: MessageCircle, href: null,       isFilter: true,  isSearch: false },
  { id: 'EVENT',      icon: Calendar,      href: null,       isFilter: true,  isSearch: false },
]

function CerveauBottomNavInner(): React.ReactElement | null {
  const pathname       = usePathname()
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const activeCategory = searchParams.get('cat') ?? 'ALL'

  if (!pathname.startsWith('/cerveau')) return null

  function handleNavClick(item: NavItem) {
    if (item.href) {
      router.push(item.href)
    } else if (item.isSearch) {
      window.dispatchEvent(new Event('cerveau:openSearch'))
    } else if (item.isFilter) {
      const params = new URLSearchParams()
      if (item.id !== 'ALL') params.set('cat', item.id)
      router.push('/cerveau' + (params.size ? '?' + params.toString() : ''))
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around z-40 md:hidden px-2"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid color-mix(in srgb, var(--border) 15%, transparent)',
        boxShadow: '0 -4px 20px rgba(27,28,26,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = item.isFilter
          ? activeCategory === item.id
          : pathname === item.href
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={
              isActive
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                  }
                : { color: 'color-mix(in srgb, var(--text) 40%, transparent)' }
            }
            aria-label={item.id}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
          </button>
        )
      })}
    </nav>
  )
}

export function CerveauBottomNav(): React.ReactElement {
  return (
    <Suspense>
      <CerveauBottomNavInner />
    </Suspense>
  )
}
