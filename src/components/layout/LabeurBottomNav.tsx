'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, ShoppingBag, History, Crown, Settings2 } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Tableau',    href: '/labeur',             icon: LayoutDashboard },
  { label: 'Tâches',     href: '/labeur/taches',      icon: ListTodo        },
  { label: 'Marché',     href: '/labeur/marche',      icon: ShoppingBag     },
  { label: 'Historique', href: '/labeur/historique',  icon: History         },
  { label: 'Titres',     href: '/labeur/titres',      icon: Crown           },
  { label: 'Réglages',   href: '/labeur/reglages',    icon: Settings2       },
]

/**
 * Navigation bas de page du module Labeur — visible uniquement sur /labeur/*.
 * Suit le même pattern que GamelleBottomNav et ParcheminBottomNav.
 */
export function LabeurBottomNav(): React.ReactElement {
  const pathname = usePathname()

  if (!pathname.startsWith('/labeur')) return <></>

  return (
    <>
      {/* Mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-40 md:hidden px-1"
        style={{
          background: 'var(--surface)',
          borderTop:  '1px solid var(--border)',
          boxShadow:  '0 -4px 12px rgba(0,0,0,0.05)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon   = item.icon
          const active = item.href === '/labeur'
            ? pathname === '/labeur'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">
                {item.label}
              </span>
              {active && (
                <div
                  className="absolute top-0 w-8 h-0.5 rounded-b-full"
                  style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Desktop — nav flottante centrée */}
      <nav
        className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 justify-center"
        style={{ paddingBottom: 16 }}
      >
        <div
          className="flex items-center justify-around gap-1 h-16 px-2"
          style={{
            width:        600,
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: 24,
            boxShadow:    '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon
            const active = item.href === '/labeur'
              ? pathname === '/labeur'
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all"
                style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[8px] font-bold uppercase tracking-tighter">
                  {item.label}
                </span>
                {active && (
                  <div
                    className="absolute top-0 w-8 h-0.5 rounded-b-full"
                    style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
