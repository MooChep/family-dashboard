'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
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
  { label: 'Cerveau',    href: '/cerveau',   icon: '◎' },
  { label: 'Ménage',     href: '/menage',    icon: '⌂', soon: true },
  { label: 'Projets',    href: '/projets',   icon: '◉', soon: true },
  { label: 'Habitudes',  href: '/habitudes', icon: '◆', soon: true },
  { label: 'Notes',      href: '/notes',     icon: '◧', soon: true },
]

const PAGE_TITLES: Record<string, string> = {
  '/':                        'Dashboard',
  '/cerveau':                 'Cerveau',
  '/epargne':                 'Épargne',
  '/epargne/mois':            'Mois',
  '/epargne/analyses':        'Analyses',
  '/epargne/analyses/depenses': 'Dépenses',
  '/epargne/analyses/global': 'Global',
  '/epargne/analyses/tags':   'Tags',
  '/epargne/regul':           'Régularisation',
  '/epargne/gestion':         'Gestion',
  '/epargne/categories':      'Catégories',
  '/menage':                  'Ménage',
  '/projets':                 'Projets',
}

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? 'Dashboard'
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function MobileHeader(): React.ReactElement {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Ferme le drawer à chaque changement de route
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Bloque le scroll body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function handleSignOut(): Promise<void> {
    await signOut({ callbackUrl: '/auth/login' })
  }

  const title = getTitle(pathname)
  const initial = session?.user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      {/* ── Top bar mobile ─────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 md:hidden"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Bouton menu hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--surface2)' }}
          aria-label="Menu"
        >
          <span className="w-4 h-px block" style={{ backgroundColor: 'var(--text)' }} />
          <span className="w-4 h-px block" style={{ backgroundColor: 'var(--text)' }} />
          <span className="w-2.5 h-px block self-start ml-2.5" style={{ backgroundColor: 'var(--text)' }} />
        </button>

        {/* Titre de la page courante */}
        <span
          className="text-sm font-semibold tracking-wide absolute left-1/2 -translate-x-1/2"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </span>

        {/* Avatar — ouvre le profil */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
          }}
          aria-label="Profil"
        >
          {initial}
        </button>
      </header>

      {/* ── Spacer pour compenser le header fixe ───────────────────────── */}
      <div className="h-14 md:hidden" />

      {/* ── Overlay ────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer ─────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out"
        style={{
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header drawer */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Bouton fermer */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
            style={{ color: 'var(--muted)', backgroundColor: 'var(--surface2)' }}
            aria-label="Fermer"
          >
            ✕
          </button>
            <span
              className="text-base font-semibold tracking-wide"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
            >
              Family Dashboard
            </span>
          {/* Remplacer un jour par une icone d'app */}
          {/* <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--bg)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              F
            </div>
           */}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname)
            if (item.soon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg opacity-45 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-5 text-center" style={{ color: 'var(--muted)' }}>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent-dim)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
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

        {/* Utilisateur + déconnexion */}
        <div
          className="px-4 py-4 flex flex-col gap-2 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => { setDrawerOpen(false); setProfileOpen(true) }}
            className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left"
            style={{ backgroundColor: 'var(--surface2)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {initial}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {session?.user?.name ?? '—'}
              </span>
              <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {session?.user?.email ?? '—'}
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>✎</span>
          </button>

          <button
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left"
            style={{ color: 'var(--danger)' }}
          >
            <span className="text-base w-5 text-center">→</span>
            Déconnexion
          </button>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}