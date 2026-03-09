'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, BarChart3, Scale, Settings } from 'lucide-react'

const EPARGNE_ITEMS = [
  { label: 'Dash',    href: '/epargne',          icon: LayoutDashboard },
  { label: 'Mois',    href: '/epargne/mois',     icon: Calendar },
  { label: 'Analyse', href: '/epargne/analyses', icon: BarChart3 },
  { label: 'Régul',   href: '/epargne/regul',    icon: Scale },
  { label: 'Gestion', href: '/epargne/gestion',  icon: Settings },
]

export function BottomNav(): React.ReactElement {
  const pathname = usePathname()

  // On vérifie qu'on est bien dans la section épargne
  if (!pathname.startsWith('/epargne')) return <></>

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-100 md:hidden bg-(--surface) border-(--border) px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {/* Safe Area pour iPhone (encoche du bas) */}
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
              "relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all pb-[env(safe-area-inset-bottom)]",
              active ? "text-(--accent)]" : "text-(--text2)"
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