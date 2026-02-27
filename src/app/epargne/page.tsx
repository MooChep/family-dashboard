// src/app/epargne/page.tsx

import { Card } from "@/components/ui/Card"

export default function EpargnePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">
          Épargne
        </h1>
        <p className="text-[var(--text2)]">
          Gestion des objectifs et comptes d’épargne.
        </p>
      </div>

      <Card className="p-8 border border-[var(--border)]">
        <p className="text-[var(--muted)]">
          Module en cours de développement.
        </p>
      </Card>
    </div>
  )
}