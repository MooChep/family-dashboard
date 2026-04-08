'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ScrollText, Archive } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Notes',   icon: ScrollText, href: '/parchemin'         },
  { label: 'Archive', icon: Archive,    href: '/parchemin/archive' },
]

function ParcheminBottomNavInner(): React.ReactElement | null {
  const pathname = usePathname()

  if (!pathname.startsWith('/parchemin')) return null

  return (
    <>
      {/* Mobile — classique plein largeur */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-100 md:hidden bg-(--surface) border-(--border) px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="absolute inset-0 bg-inherit -z-10" />
        <NavLinks pathname={pathname} />
      </nav>

      {/* Desktop — flottante centrée */}
      <nav
        className="hidden md:flex fixed bottom-0 left-0 right-0 z-100 justify-center"
        style={{ paddingBottom: 16 }}
      >
        <div
          className="flex items-center justify-around gap-1 h-16 px-2"
          style={{
            width: 240,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <NavLinks pathname={pathname} />
        </div>
      </nav>
    </>
  )
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.href === '/parchemin'
          ? pathname === item.href || (pathname.startsWith('/parchemin/') && !pathname.startsWith('/parchemin/archive'))
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all',
              active ? 'text-(--accent)' : 'text-(--text2)'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>
            {active && (
              <div className="absolute top-0 w-10 h-0.5 rounded-b-full bg-(--accent) shadow-[0_0_8px_var(--accent)]" />
            )}
          </Link>
        )
      })}
    </>
  )
}

export function ParcheminBottomNav(): React.ReactElement {
  return (
    <Suspense>
      <ParcheminBottomNavInner />
    </Suspense>
  )
}
