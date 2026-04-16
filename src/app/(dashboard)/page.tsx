import { type ReactElement } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { redirect } from 'next/navigation'
import { PiggyBank, ScrollText, ChefHat, CalendarDays, BrushCleaning, Crown } from 'lucide-react'

export default async function DashboardPage(): Promise<ReactElement> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  const user = session.user

  const MODULES = [
    { 
      label: 'Parchemin',     
      href: '/parchemin',     
      icon: <ScrollText size={20} strokeWidth={1.5} />, 
      description: 'Marquer au fer rouge les événements du royaume qui pèsent sur votre mental.', 
      soon: false 
    },
    { 
      label: 'Butin',    
      href: '/butin',
      icon: <PiggyBank size={20} strokeWidth={1.5} />, 
      description: "Suivre la trace de chaque écu, pour faire fructifier la réserve du Fief.", 
      soon: false 
    },
    { 
      label: 'Gamelle',     
      href: '/gamelle',    
      icon: <ChefHat size={20} strokeWidth={1.5} />, 
      description: 'Préparer les victuailles pour que personne ne crie famine.', 
      soon: false 
    },
    {
      label: 'Labeur',
      href: '/labeur',
      icon: <BrushCleaning size={20} strokeWidth={1.5} />,
      description: 'Organiser les corvées et les diligences pour l’entretien du domaine.',
      soon: false
    },
    {
      label: 'Oyez',
      href: '/habitudes',
      icon: <CalendarDays size={20} strokeWidth={1.5} />,
      description: 'Annoncer les temps forts et les célébrations du royaume au son des trompettes.', 
      soon: true
    },
    {
      label: 'Heritier',
      href: '/heritier',
      icon: <Crown size={20} strokeWidth={1.5} />,
      description: 'Chronique de la lignée et archives des hauts faits de la descendance.', 
      soon: true
    }
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
          {MODULES.map((module) => {
            // Si le module est "soon", on transforme le lien en <div> pour éviter l'interactivité interdite
            const Container = module.soon ? 'div' : 'a'
            
            return (
              <Container 
                key={module.href} 
                href={module.soon ? undefined : module.href}
                className="block"
              >
                <div
                  className="rounded-xl p-5 flex flex-col gap-3 h-full"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    opacity: module.soon ? 0.6 : 1,
                    cursor: module.soon ? 'default' : 'pointer',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center" style={{ color: 'var(--accent)' }}>{module.icon}</span>
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
              </Container>
            )
          })}
        </div>
      </div>
    </div>
  )
}