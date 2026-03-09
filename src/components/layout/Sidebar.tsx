'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProfileModal } from '@/components/layout/ProfileModal'

interface NavItem {
  label: string
  href: string
  icon: string
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/',          icon: '⊞' },
  { label: 'Épargne',    href: '/epargne',   icon: '◈' },
  { label: 'Ménage',     href: '/menage',    icon: '⌂', soon: true },
  { label: 'Projets',    href: '/projets',   icon: '◉', soon: true },
  { label: 'Habitudes',  href: '/habitudes', icon: '◎', soon: true },
  { label: 'Notes',      href: '/notes',     icon: '◧', soon: true },
]

export function Sidebar(): React.ReactElement {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleSignOut(): Promise<void> {
    await signOut({ callbackUrl: '/auth/login' })
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 hidden md:flex flex-col z-40 bg-(--surface) border-r border-(--border)]"
    >
      {/* ─── Logo ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-(--border)]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-(--accent) text-(--bg) font-(--font-mono)]">
          F
        </div>
        <span className="text-base font-semibold tracking-wide text-(--text) font-(--font-display)]">
          Family Dashboard
        </span>
      </div>

      {/* ─── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          if (item.soon) {
            return (
              <div key={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-not-allowed opacity-45">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center text-(--muted)]">{item.icon}</span>
                  <span className="text-sm text-(--muted)]">{item.label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-(--surface2) text-(--muted2) font-(--font-mono) text-[10px]">
                  bientôt
                </span>
              </div>
            )
          }
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                active ? 'bg-(--accent-dim) text-(--accent)]' : 'text-(--text2) hover:bg-(--surface2)]'
              )}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {active && <div className="ml-auto w-1 h-4 rounded-full bg-(--accent)]" />}
            </Link>
          )
        })}
      </nav>

      {/* ─── Utilisateur ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex flex-col gap-2 border-t border-(--border)]">
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left transition-colors hover:bg-(--surface2)]"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-(--accent-dim) text-(--accent) font-(--font-mono)]">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate text-(--text)]">
              {session?.user?.name ?? '—'}
            </span>
            <span className="text-xs truncate text-(--muted)]">
              {session?.user?.email ?? '—'}
            </span>
          </div>
          <span className="text-xs text-(--muted)]">✎</span>
        </button>

        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left text-(--danger) hover:bg-(--accent-dim)]">
          <span className="text-base w-5 text-center">→</span>
          Déconnexion
        </button>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </aside>
  )
}