'use client'

import { useState } from 'react'
import { NavPanelContent } from '@/components/layout/NavPanelContent'
import { ProfileModal } from '@/components/layout/ProfileModal'

export function Sidebar(): React.ReactElement {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 hidden md:flex flex-col z-40"
      style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      <NavPanelContent onProfileOpen={() => setProfileOpen(true)} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </aside>
  )
}
