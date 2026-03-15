'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, BarChart3, Scale, Settings, Wallet,
  Brain, CircleCheck, BellRing, List, FolderKanban, StickyNote, MessageCircle, Archive,
} from 'lucide-react'

// ── Navigation Épargne ──

const EPARGNE_ITEMS = [
  { label: 'Dash',    href: '/epargne',          icon: LayoutDashboard },
  { label: 'Mois',    href: '/epargne/mois',     icon: Calendar },
  { label: 'Budget',  href: '/epargne/budget',   icon: Wallet },
  { label: 'Analyse', href: '/epargne/analyses', icon: BarChart3 },
  { label: 'Régul',   href: '/epargne/regul',    icon: Scale },
  { label: 'Gestion', href: '/epargne/gestion',  icon: Settings },
]

// ── Navigation Cerveau ──

const CERVEAU_ITEMS = [
  { label: 'Accueil', href: '/cerveau',              icon: Brain         },
  { label: 'Todos',   href: '/cerveau/todos',        icon: CircleCheck   },
  { label: 'Rappels', href: '/cerveau/rappels',      icon: BellRing      },
  { label: 'Listes',  href: '/cerveau/listes',       icon: List          },
  { label: 'Projets', href: '/cerveau/projets',      icon: FolderKanban  },
  { label: 'Notes',   href: '/cerveau/notes',        icon: StickyNote    },
  { label: 'Discus',  href: '/cerveau/discussions',  icon: MessageCircle },
  { label: 'Archive', href: '/cerveau/archive',      icon: Archive       },
]

// ── Composant ──

export function BottomNav(): React.ReactElement {
  const pathname = usePathname()

  const items = pathname.startsWith('/cerveau')
    ? CERVEAU_ITEMS
    : pathname.startsWith('/epargne')
      ? EPARGNE_ITEMS
      : null

  if (!items) return <></>

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-100 md:hidden px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="absolute inset-0 bg-inherit -z-10" />

      {items.map((item) => {
        const Icon = item.icon
        const active = item.href === '/cerveau' || item.href === '/epargne'
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all pb-[env(safe-area-inset-bottom)]"
            style={{ color: active ? 'var(--accent)' : 'var(--text2)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">
              {item.label}
            </span>

            {active && (
              <div className="absolute top-0 w-10 h-0.5 rounded-b-full shadow-[0_0_8px_var(--accent)]" style={{ background: 'var(--accent)' }} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}