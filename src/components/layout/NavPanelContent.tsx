'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Suspense } from 'react'
import { CategoryNav } from '@/components/cerveau/CategoryNav'
import type { EntryType } from '@prisma/client'
import {
  PiggyBank, Brain, Home, FolderOpen,
  LayoutDashboard, Settings2, LogOut,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/',        icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { label: 'Épargne',   href: '/epargne', icon: <PiggyBank       size={18} strokeWidth={1.5} /> },
  { label: 'Cerveau',   href: '/cerveau', icon: <Brain           size={18} strokeWidth={1.5} /> },
  { label: 'Ménage',    href: '/menage',  icon: <Home            size={18} strokeWidth={1.5} />, soon: true },
  { label: 'Projets',   href: '/projets', icon: <FolderOpen      size={18} strokeWidth={1.5} />, soon: true },
]

function CerveauFilterSection({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams()
  const active = (searchParams.get('cat') as EntryType | null) ?? 'ALL'
  if (!pathname.startsWith('/cerveau')) return null
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <CategoryNav active={active} layout="vertical" />
    </div>
  )
}

interface NavPanelContentProps {
  /** Fourni sur mobile : affiche le bouton ✕ et ferme le drawer au clic nav */
  onClose?: () => void
  onProfileOpen: () => void
}

export function NavPanelContent({ onClose, onProfileOpen }: NavPanelContentProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut({ callbackUrl: '/auth/login' })
  }

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ─── Logo ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {onClose ? (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm shrink-0"
            style={{ color: 'var(--muted)', backgroundColor: 'var(--surface2)' }}
            aria-label="Fermer"
          >
            ✕
          </button>
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
          >
            F
          </div>
        )}
        <span
          className="text-base font-semibold tracking-wide"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
        >
          Family Dashboard
        </span>
      </div>

      {/* ─── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          if (item.soon) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg opacity-45 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 flex justify-center" style={{ color: 'var(--muted)' }}>
                    {item.icon}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{item.label}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface2)',
                    color: 'var(--muted2)',
                    fontFamily: 'var(--font-mono)',
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
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              <span className="w-5 flex justify-center">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {active && (
                <div
                  className="ml-auto w-1.5 h-4 rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ─── Filtre Cerveau ────────────────────────────────────────────── */}
      <Suspense>
        <CerveauFilterSection pathname={pathname} />
      </Suspense>

      {/* ─── Utilisateur ───────────────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex flex-col gap-2 shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => { onClose?.(); onProfileOpen() }}
          className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left transition-colors"
          style={{ backgroundColor: 'var(--surface2)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
          >
            {session?.user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {session?.user?.name ?? '—'}
            </span>
            <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
              {session?.user?.email ?? '—'}
            </span>
          </div>
          <Settings2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        </button>

        <button
          onClick={() => void handleSignOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors"
          style={{ color: 'var(--danger)' }}
        >
          <span className="w-5 flex justify-center">
            <LogOut size={18} strokeWidth={1.5} />
          </span>
          Déconnexion
        </button>
      </div>
    </>
  )
}
