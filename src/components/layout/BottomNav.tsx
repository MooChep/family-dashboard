'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const MOBILE_ITEMS = [
  { label: 'Dash',     href: '/',        icon: '⊞' },
  { label: 'Épargne',  href: '/epargne', icon: '◈' },
  { label: 'Ménage',   href: '/menage',  icon: '⌂', soon: true },
  { label: 'Projets',  href: '/projets', icon: '◉', soon: true },
]

export function BottomNav(): React.ReactElement {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-50 md:hidden bg-[var(--surface)] border-[var(--border)] pb-[env(safe-area-inset-bottom)]"
    >
      {MOBILE_ITEMS.map((item) => {
        const active = isActive(item.href)
        
        if (item.soon) {
          return (
            <div key={item.href} className="flex flex-col items-center opacity-30">
              <span className="text-xl text-[var(--muted)]">{item.icon}</span>
              <span className="text-[10px] text-[var(--muted)]">{item.label}</span>
            </div>
          )
        }

        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              active ? "text-[var(--accent)]" : "text-[var(--text2)]"
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            {active && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}