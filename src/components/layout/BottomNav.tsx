'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, BarChart3, Scale, Settings, Wallet, ChefHat, ShoppingCart, BookOpen, Archive, Layers } from 'lucide-react'

const EPARGNE_ITEMS = [
  { label: 'Dash',    href: '/epargne',          icon: LayoutDashboard },
  { label: 'Mois',    href: '/epargne/mois',     icon: Calendar },
  { label: 'Budget',  href: '/epargne/budget',   icon: Wallet },
  { label: 'Analyse', href: '/epargne/analyses', icon: BarChart3 },
  { label: 'Régul',   href: '/epargne/regul',    icon: Scale },
  { label: 'Gestion', href: '/epargne/gestion',  icon: Settings },
]

const GAMELLE_ITEMS = [
  { label: 'Accueil',  href: '/gamelle',              icon: ChefHat        },
  { label: 'Recettes', href: '/gamelle/recettes',     icon: BookOpen       },
  { label: 'Menu',     href: '/gamelle/menu',         icon: Calendar       },
  { label: 'Courses',  href: '/gamelle/courses',      icon: ShoppingCart   },
  { label: 'Stock',    href: '/gamelle/stock',        icon: Archive        },
  { label: 'Config',   href: '/gamelle/ingredients',   icon: Layers         },
]

export function BottomNav(): React.ReactElement {
  const pathname = usePathname()

  if (pathname.startsWith('/gamelle')) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-100 md:hidden bg-(--surface) border-(--border) px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="absolute inset-0 bg-inherit -z-10" />
        {GAMELLE_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.href === '/gamelle'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all pb-[env(safe-area-inset-bottom)]',
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
      </nav>
    )
  }

  if (!pathname.startsWith('/epargne')) return <></>

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-100 md:hidden bg-(--surface) border-(--border) px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="absolute inset-0 bg-inherit -z-10" />

      {EPARGNE_ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.href === '/epargne'
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all pb-[env(safe-area-inset-bottom)]',
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
    </nav>
  )
}