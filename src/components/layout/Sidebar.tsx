'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

// Définition des modules de navigation
// "soon: true" = module non développé, affiché avec badge "bientôt" et non cliquable
interface NavItem {
  label: string
  href: string
  icon: string
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/',          icon: '⊞' },
  { label: 'Épargne',    href: '/epargne',   icon: '◈', soon: true },
  { label: 'Ménage',     href: '/menage',    icon: '⌂', soon: true },
  { label: 'Projets',    href: '/projets',   icon: '◉', soon: true },
  { label: 'Habitudes',  href: '/habitudes', icon: '◎', soon: true },
  { label: 'Notes',      href: '/notes',     icon: '◧', soon: true },
]

export function Sidebar(): React.ReactElement {
  const pathname = usePathname()
  const { data: session } = useSession()

  async function handleSignOut(): Promise<void> {
    await signOut({ callbackUrl: '/auth/login' })
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      style={{
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* ─── Logo ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          F
        </div>
        <span
          className="text-base font-semibold tracking-wide"
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Family Dashboard
        </span>
      </div>

      {/* ─── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const isDisabled = item.soon

          if (isDisabled) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-not-allowed"
                style={{ opacity: 0.45 }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-base w-5 text-center"
                    style={{ color: 'var(--muted)' }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--muted)' }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface2)',
                    color: 'var(--muted2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                  }}
                >
                  bientôt
                </span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              )}
              style={{
                backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <div
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ─── Utilisateur connecté ─────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex flex-col gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          {/* Avatar généré depuis les initiales */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              backgroundColor: 'var(--accent-dim)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {session?.user?.name
              ? session.user.name.charAt(0).toUpperCase()
              : '?'}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text)' }}
            >
              {session?.user?.name ?? '—'}
            </span>
            <span
              className="text-xs truncate"
              style={{ color: 'var(--muted)' }}
            >
              {session?.user?.email ?? '—'}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
          style={{
            color: 'var(--danger)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-dim)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span className="text-base w-5 text-center">→</span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}