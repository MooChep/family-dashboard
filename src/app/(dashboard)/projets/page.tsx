'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { ProjectCard } from '@/components/epargne/ProjectCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatAmount } from '@/lib/formatters'
import { type SavingsProject, type Category } from '@prisma/client'

type ProjetWithCategory = SavingsProject & {
  allocations: { amount: number }[]
  category: Category | null
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ProjetsPage(): ReactElement {
  const [projets, setProjets]     = useState<ProjetWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal nouveau projet
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newName, setNewName]     = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newSaving, setNewSaving] = useState(false)
  const [newError, setNewError]   = useState<string | null>(null)

  // Modal dépense/entrée
  const [depenseProjet, setDepenseProjet]   = useState<ProjetWithCategory | null>(null)
  const [depAmount, setDepAmount]           = useState('')
  const [depMonth, setDepMonth]             = useState(getCurrentMonth())
  const [depIsExpense, setDepIsExpense]     = useState(true)
  const [depSaving, setDepSaving]           = useState(false)
  const [depError, setDepError]             = useState<string | null>(null)

  // Modal réaffectation
  const [reaffectProjet, setReaffectProjet] = useState<ProjetWithCategory | null>(null)
  const [reaffectTarget, setReaffectTarget] = useState('')
  const [reaffectMonth, setReaffectMonth]   = useState(getCurrentMonth())
  const [reaffectSaving, setReaffectSaving] = useState(false)
  const [reaffectError, setReaffectError]   = useState<string | null>(null)

  async function loadProjets(): Promise<void> {
    setIsLoading(true)
    try {
      const res = await fetch('/api/epargne/projets')
      const data = await res.json() as ProjetWithCategory[]
      setProjets(Array.isArray(data) ? data : [])
    } finally { setIsLoading(false) }
  }

  useEffect(() => { void loadProjets() }, [])

  // ── Créer projet ────────────────────────────────────────────────────────────
  async function handleCreateProjet(): Promise<void> {
    if (!newName.trim()) { setNewError('Le nom est requis'); return }
    setNewSaving(true); setNewError(null)
    try {
      const target = newTarget.trim() ? parseFloat(newTarget.replace(',', '.')) : null
      const res = await fetch('/api/epargne/projets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), targetAmount: target }),
      })
      if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
      setIsNewOpen(false); setNewName(''); setNewTarget('')
      await loadProjets()
    } catch (e) {
      setNewError(e instanceof Error ? e.message : 'Erreur')
    } finally { setNewSaving(false) }
  }

  // ── Dépense / Entrée ────────────────────────────────────────────────────────
  async function handleDepense(): Promise<void> {
    if (!depenseProjet) return
    const amount = parseFloat(depAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setDepError('Montant invalide'); return }
    setDepSaving(true); setDepError(null)
    try {
      const res = await fetch(`/api/epargne/projets/${depenseProjet.id}/depense`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, month: depMonth, isExpense: depIsExpense }),
      })
      if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
      setDepenseProjet(null); setDepAmount('')
      await loadProjets()
    } catch (e) {
      setDepError(e instanceof Error ? e.message : 'Erreur')
    } finally { setDepSaving(false) }
  }

  // ── Réaffectation ───────────────────────────────────────────────────────────
  async function handleReaffecter(): Promise<void> {
    if (!reaffectProjet || !reaffectTarget) { setReaffectError('Sélectionne un projet cible'); return }
    setReaffectSaving(true); setReaffectError(null)
    try {
      const res = await fetch(`/api/epargne/projets/${reaffectProjet.id}/reaffecter`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProjectId: reaffectTarget, month: reaffectMonth }),
      })
      if (!res.ok) { const err = await res.json() as { error: string }; throw new Error(err.error) }
      setReaffectProjet(null); setReaffectTarget('')
      await loadProjets()
    } catch (e) {
      setReaffectError(e instanceof Error ? e.message : 'Erreur')
    } finally { setReaffectSaving(false) }
  }

  function openReaffecter(projet: ProjetWithCategory): void {
    setReaffectProjet(projet)
    setReaffectTarget('')
    setReaffectMonth(getCurrentMonth())
    setReaffectError(null)
  }

  const activeProjets   = projets.filter((p) => p.isActive)
  const inactiveProjets = projets.filter((p) => !p.isActive)
  const reaffectTargets = activeProjets.filter((p) => p.id !== reaffectProjet?.id)

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            Projets d'épargne
          </h1>
          <Button variant="primary" size="md" onClick={() => { setIsNewOpen(true); setNewError(null) }}>
            + Nouveau projet
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : activeProjets.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun projet actif</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {activeProjets.map((projet) => (
              <div key={projet.id} className="flex flex-col gap-2">
                <ProjectCard project={projet} onReaffecter={() => openReaffecter(projet)} />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDepenseProjet(projet); setDepAmount(''); setDepMonth(getCurrentMonth()); setDepIsExpense(true); setDepError(null) }}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    + Opération
                  </button>
                  <button
                    onClick={() => openReaffecter(projet)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}
                  >
                    Réaffecter →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {inactiveProjets.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Projets terminés / réaffectés
            </h3>
            <div className="grid grid-cols-2 gap-4" style={{ opacity: 0.55 }}>
              {inactiveProjets.map((projet) => (
                <ProjectCard key={projet.id} project={projet} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal nouveau projet ─────────────────────────────────────────── */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Nouveau projet d'épargne">
        <div className="flex flex-col gap-4">
          <Input label="Nom du projet" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Mariage, Voiture..." autoFocus />
          <Input label="Objectif (€) — optionnel" type="text" inputMode="decimal" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="Ex: 5000" />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Une catégorie de type Projet sera créée automatiquement avec le même nom.
          </p>
          {newError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{newError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsNewOpen(false)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={newSaving} onClick={handleCreateProjet}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal dépense/entrée ─────────────────────────────────────────── */}
      <Modal isOpen={depenseProjet !== null} onClose={() => setDepenseProjet(null)} title={`Opération — ${depenseProjet?.name ?? ''}`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDepIsExpense(true)} className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: depIsExpense ? 'var(--danger)' : 'var(--surface2)', color: depIsExpense ? '#fff' : 'var(--text2)', border: '1px solid var(--border)' }}>
                Dépense (−)
              </button>
              <button type="button" onClick={() => setDepIsExpense(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: !depIsExpense ? 'var(--success)' : 'var(--surface2)', color: !depIsExpense ? '#fff' : 'var(--text2)', border: '1px solid var(--border)' }}>
                Entrée (+)
              </button>
            </div>
          </div>
          <Input label="Montant (€)" type="text" inputMode="decimal" value={depAmount} onChange={(e) => setDepAmount(e.target.value)} placeholder="0,00" autoFocus />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Mois</label>
            <input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
          </div>
          {depenseProjet && depAmount && !isNaN(parseFloat(depAmount)) && (
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Solde après opération :</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {formatAmount(Math.max(0, depenseProjet.currentAmount + (depIsExpense ? -1 : 1) * parseFloat(depAmount.replace(',', '.'))))}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}> / {depenseProjet.targetAmount ? formatAmount(depenseProjet.targetAmount) : '∞'}</span>
              </p>
            </div>
          )}
          {depError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{depError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setDepenseProjet(null)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={depSaving} onClick={handleDepense}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal réaffectation ──────────────────────────────────────────── */}
      <Modal isOpen={reaffectProjet !== null} onClose={() => setReaffectProjet(null)} title={`Réaffecter — ${reaffectProjet?.name ?? ''}`}>
        <div className="flex flex-col gap-4">
          {/* Aperçu solde */}
          {reaffectProjet && (
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Solde à transférer</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {formatAmount(reaffectProjet.currentAmount)}
              </p>
            </div>
          )}

          {/* Projet cible */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Projet cible</label>
            {reaffectTargets.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Aucun autre projet actif disponible</p>
            ) : (
              <div className="flex flex-col gap-1">
                {reaffectTargets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReaffectTarget(p.id)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: reaffectTarget === p.id ? 'var(--accent-dim)' : 'var(--surface2)',
                      border: `1px solid ${reaffectTarget === p.id ? 'var(--accent)' : 'var(--border)'}`,
                      color: reaffectTarget === p.id ? 'var(--accent)' : 'var(--text)',
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {formatAmount(p.currentAmount)}
                      {p.targetAmount ? ` / ${formatAmount(p.targetAmount)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mois */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Mois de l'opération</label>
            <input type="month" value={reaffectMonth} onChange={(e) => setReaffectMonth(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }} />
          </div>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Le projet <strong style={{ color: 'var(--text)' }}>{reaffectProjet?.name}</strong> sera marqué comme terminé et sa catégorie archivée.
          </p>

          {reaffectError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{reaffectError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setReaffectProjet(null)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={reaffectSaving} onClick={handleReaffecter} disabled={!reaffectTarget}>
              Confirmer le transfert
            </Button>
          </div>
        </div>
      </Modal>
    </EpargneLayout>
  )
}