'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { NavPanelContent } from '@/components/layout/NavPanelContent'
import { ProfileModal } from '@/components/layout/ProfileModal'

const PAGE_TITLES: Record<string, string> = {
  '/':                            'Dashboard',
  '/cerveau':                     'Cerveau',
  '/epargne':                     'Épargne',
  '/epargne/mois':                'Mois',
  '/epargne/analyses':            'Analyses',
  '/epargne/analyses/depenses':   'Dépenses',
  '/epargne/analyses/global':     'Global',
  '/epargne/analyses/tags':       'Tags',
  '/epargne/regul':               'Régularisation',
  '/epargne/gestion':             'Gestion',
  '/epargne/categories':          'Catégories',
  '/menage':                      'Ménage',
  '/projets':                     'Projets',
}

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? 'Dashboard'
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

  const title   = getTitle(pathname)
  const initial = session?.user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 flex items-end justify-between px-4 z-40 md:hidden"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3.5rem + env(safe-area-inset-top))',
        }}
      >
        <div className="flex items-center justify-between w-full h-14">
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

        <span
          className="text-sm font-semibold tracking-wide absolute left-1/2 -translate-x-1/2"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </span>

        <button
          onClick={() => setProfileOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
          aria-label="Profil"
        >
          {initial}
        </button>
        </div>
      </header>

      {/* ── Spacer ─────────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }} />

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
        <NavPanelContent
          onClose={() => setDrawerOpen(false)}
          onProfileOpen={() => setProfileOpen(true)}
        />
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
