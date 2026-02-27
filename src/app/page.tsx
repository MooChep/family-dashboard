// src/app/page.tsx

import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import Link from "next/link"

export default function DashboardPage() {
  const modules = [
    { name: "Épargne", href: "/epargne", available: false },
    { name: "Ménage", href: "/menage", available: false },
    { name: "Projets", href: "/projets", available: false },
    { name: "Habitudes", href: "/habitudes", available: false },
    { name: "Notes", href: "/notes", available: false },
  ]

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">
          Dashboard
        </h1>

        <p className="text-[var(--text2)]">
          Vue d'ensemble de votre environnement familial.
        </p>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {modules.map((module) => {
          const content = (
            <Card className="p-6 flex flex-col justify-between min-h-[140px] border border-[var(--border)] hover:border-[var(--border2)] transition-colors">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-medium">
                  {module.name}
                </h2>

                {!module.available && (
                  <Badge variant="default">
                    Bientôt
                  </Badge>
                )}
              </div>

              <p className="text-sm text-[var(--muted)] mt-4">
                Module en cours de développement.
              </p>
            </Card>
          )

          if (module.available) {
            return (
              <Link key={module.name} href={module.href}>
                {content}
              </Link>
            )
          }

          return (
            <div key={module.name} className="opacity-70 cursor-not-allowed">
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}