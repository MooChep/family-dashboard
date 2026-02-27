import { type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage(): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  // session est forcément défini ici — (dashboard)/layout.tsx redirige sinon
  const user = session!.user

  const MODULES = [
    { label: 'Épargne',    href: '/epargne',   icon: '◈', description: "Suivi des comptes et objectifs d'épargne", soon: true },
    { label: 'Ménage',     href: '/menage',    icon: '⌂', description: 'Organisation des tâches ménagères', soon: true },
    { label: 'Projets',    href: '/projets',   icon: '◉', description: 'Suivi des projets familiaux', soon: true },
    { label: 'Habitudes',  href: '/habitudes', icon: '◎', description: 'Suivi des habitudes quotidiennes', soon: true },
    { label: 'Notes',      href: '/notes',     icon: '◧', description: 'Notes et mémos partagés', soon: true },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Bonjour,
        </p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          {user.name}
        </h2>
      </div>

      <Card>
        <CardHeader title="Session active" subtitle="Informations de connexion courante" />
        <div className="flex flex-col gap-2 mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs w-24" style={{ color: 'var(--muted)' }}>utilisateur</span>
            <span className="text-sm" style={{ color: 'var(--text2)' }}>{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs w-24" style={{ color: 'var(--muted)' }}>thème actif</span>
            <Badge variant="accent">{user.config.theme}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs w-24" style={{ color: 'var(--muted)' }}>id</span>
            <span className="text-xs" style={{ color: 'var(--muted2)' }}>{user.id}</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          Modules
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <div
              key={module.href}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: module.soon ? 0.6 : 1,
                cursor: module.soon ? 'default' : 'pointer',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl" style={{ color: 'var(--accent)' }}>{module.icon}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                    {module.label}
                  </span>
                </div>
                {module.soon && <Badge variant="default">bientôt</Badge>}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                {module.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}