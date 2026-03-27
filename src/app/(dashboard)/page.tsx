import { type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
// Import des icônes Lucide
import { PiggyBank, Brain, ChefHat, CalendarDays } from 'lucide-react'

export default async function DashboardPage(): Promise<ReactElement> {
  const session = await getServerSession(authOptions)
  // session est forcément défini ici — (dashboard)/layout.tsx redirige sinon
  const user = session!.user

  // Remplacement des symboles texte par des composants d'icônes Lucide
const MODULES = [
  { 
    label: 'Épargne',    
    href: '/epargne',   
    icon: <PiggyBank size={20} strokeWidth={1.5} />, 
    description: "Suivi des comptes et objectifs d'épargne", 
    soon: false 
  },
  { 
    label: 'Cerveau',    
    href: '/cerveau',    
    icon: <Brain size={20} strokeWidth={1.5} />,      
    description: 'Vider sa charge mentale', 
    soon: false 
  },
  { 
    label: 'Popote',     
    href: '/popote',    
    icon: <ChefHat size={20} strokeWidth={1.5} />, 
    description: 'Gestion des recettes et planification des repas', 
    soon: false 
  },
  { 
    label: 'Calendrier', 
    href: '/habitudes', 
    icon: <CalendarDays size={20} strokeWidth={1.5} />, 
    description: 'Événements familiaux et planning partagé', 
    soon: true 
  },
]
  return (
    <div className="flex flex-col gap-8 pt-15">
      <div className="flex flex-col gap-1">
        <p className="text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
          Bonjour,
        </p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          {user.name}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          Modules
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <a key={module.href} href={module.href}>
              <div
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
                    {/* Le style de couleur var(--accent) s'appliquera directement à l'icône SVG */}
                    <span className="text-xl" style={{ color: 'var(--accent)' }}>{module.icon}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                      {module.label}
                    </span>
                  </div>
                  {module.soon && <Badge variant="success">bientôt</Badge>}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {module.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}