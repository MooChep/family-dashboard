'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { ScrollText, Archive } from 'lucide-react'

interface NavItem {
  id:   string
  icon: React.ElementType
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'notes',   icon: ScrollText, href: '/parchemin'         },
  { id: 'archive', icon: Archive,    href: '/parchemin/archive' },
]

function ParcheminBottomNavInner(): React.ReactElement | null {
  const pathname = usePathname()
  const router   = useRouter()

  if (!pathname.startsWith('/parchemin')) return null

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
        const isActive = pathname === item.href || (item.href === '/parchemin' && pathname.startsWith('/parchemin/') && !pathname.startsWith('/parchemin/archive'))
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.href)}
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

export function ParcheminBottomNav(): React.ReactElement {
  return (
    <Suspense>
      <ParcheminBottomNavInner />
    </Suspense>
  )
}
