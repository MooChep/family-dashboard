'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, ShoppingCart, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Recettes', href: '/popote/recettes', icon: BookOpen      },
  { label: 'Menu',     href: '/popote/menu',     icon: CalendarDays  },
  { label: 'Courses',  href: '/popote/courses',  icon: ShoppingCart  },
  { label: 'Stock',    href: '/popote/stock',    icon: Archive       },
]

export function PopoteBottomNav(): React.ReactElement {
  const pathname = usePathname()

  if (!pathname.startsWith('/popote')) return <></>

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-40 md:hidden px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      style={{
        background:  'var(--surface)',
        borderTop:   '1px solid var(--border)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const Icon   = item.icon
        const active = pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all pb-[env(safe-area-inset-bottom)]',
            )}
            style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
            {active && (
              <div
                className="absolute top-0 w-10 h-0.5 rounded-b-full"
                style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
