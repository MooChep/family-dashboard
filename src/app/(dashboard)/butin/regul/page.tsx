'use client'
import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { ButinLayout } from '@/components/butin/ButinLayout'
import { Button } from '@/components/ui/Button'
import { formatAmount } from '@/lib/formatters'
import { type BankAccount } from '@prisma/client'
import { MultiLineChart, SectionCard } from '@/components/butin/analyses/AnalysesCharts'

interface ReconciliationEntry { accountId: string; balance: number; account: BankAccount }
interface Reconciliation {
  id: string
  month: string
  createdAt: string
  totalReal: number
  totalBdd: number
  gap: number
  note: string | null
  entries: ReconciliationEntry[]
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatRegulDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

function formatRegulDateShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function RegulPage(): ReactElement {
  const [comptes, setComptes]           = useState<BankAccount[]>([])
  const [allReguls, setAllReguls]       = useState<Reconciliation[]>([])
  const [totalBdd, setTotalBdd]         = useState(0)
  const [balances, setBalances]         = useState<Record<string, string>>({})
  const [note, setNote]                 = useState('')
  const [isLoading, setIsLoading]       = useState(true)
  const [isSaving, setIsSaving]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [saved, setSaved]               = useState(false)

  const loadAll = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    const [comptesRes, allRegulsRes, projetsRes] = await Promise.all([
      fetch('/api/butin/comptes'),
      fetch('/api/butin/regul'),
      fetch('/api/butin/projets'),
    ])
    const comptesData = await comptesRes.json() as BankAccount[]
    const allRegulsData = await allRegulsRes.json() as Reconciliation[]
    const projetsData = await projetsRes.json() as { currentAmount: number; isActive: boolean }[]

    const activeComptes = comptesData.filter((c) => c.isActive)
    setComptes(activeComptes)
    setTotalBdd(projetsData.filter((p) => p.isActive).reduce((s, p) => s + p.currentAmount, 0))
    setAllReguls(allRegulsData)

    // Pré-remplir avec les valeurs de la dernière régul
    const lastRegul = allRegulsData[allRegulsData.length - 1]
    const init: Record<string, string> = {}
    for (const c of activeComptes) {
      const prev = lastRegul?.entries.find((e) => e.accountId === c.id)
      init[c.id] = prev ? prev.balance.toFixed(2) : ''
    }
    setBalances(init)
    setIsLoading(false)
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const entries = comptes.map((c) => ({
    accountId: c.id,
    balance: parseFloat(balances[c.id]?.replace(',', '.') ?? '0') || 0,
  }))
  const totalReal = entries.reduce((s, e) => s + e.balance, 0)
  const gap = totalReal - totalBdd
  const allFilled = comptes.length > 0 && comptes.every((c) => balances[c.id]?.trim() !== '')

  async function handleSave(): Promise<void> {
    setIsSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/butin/regul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: getCurrentMonth(), entries, note }),
      })
      if (!res.ok) throw new Error('Erreur de sauvegarde')
      setNote('')
      setSaved(true)
      await loadAll()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setIsSaving(false) }
  }

  // ── Graphiques ──
  const owners = [...new Set(comptes.map((c) => c.owner).filter(Boolean))]

  const chartsData = allReguls.map((r) => {
    const label = formatRegulDateShort(r.createdAt)
    const row: Record<string, number | string> = { date: label, Fortune: r.totalReal }
    owners.forEach(owner => {
      row[owner] = r.entries
        .filter(e => e.account.owner === owner)
        .reduce((sum, e) => sum + e.balance, 0)
    })
    comptes.forEach(c => {
      const entry = r.entries.find(e => e.accountId === c.id)
      row[c.name] = entry?.balance ?? 0
    })
    return row
  })

  if (isLoading) {
    return (
      <ButinLayout>
        <div className="pt-15 md:pt-0 flex items-center justify-center h-64">
          <p className="text-(--muted) text-sm">Chargement…</p>
        </div>
      </ButinLayout>
    )
  }

  return (
    <ButinLayout>
      <div className="flex flex-col gap-8 pb-24 pt-15 md:pt-0">

        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Régularisation</h2>
          <p className="text-xs text-(--muted) mt-0.5">
            {allReguls.length > 0
              ? `Dernière régul : ${formatRegulDate(allReguls[allReguls.length - 1].createdAt)}`
              : 'Aucune régul effectuée'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* GAUCHE : Saisie */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <SectionCard title="Soldes réels">
              <div className="flex flex-col gap-3">
                {comptes.map((compte) => (
                  <div key={compte.id} className="flex items-center justify-between p-3 rounded-xl bg-(--surface2) border border-(--border)">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{compte.name}</span>
                      <span className="text-[10px] text-(--muted) uppercase tracking-wider">{compte.owner}</span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={balances[compte.id] ?? ''}
                      onChange={(e) => setBalances(prev => ({ ...prev, [compte.id]: e.target.value }))}
                      className="w-28 md:w-32 px-3 py-2 rounded-lg text-right font-mono text-sm bg-(--surface) border border-(--border) focus:border-(--accent) outline-none"
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-(--border) bg-(--surface) text-center">
                <p className="text-[10px] uppercase text-(--muted) mb-1">Total Réel</p>
                <p className="text-sm font-mono font-bold">{formatAmount(totalReal)}</p>
              </div>
              <div className="p-4 rounded-xl border border-(--border) bg-(--surface) text-center">
                <p className="text-[10px] uppercase text-(--muted) mb-1">Théorique</p>
                <p className="text-sm font-mono font-bold text-(--accent)">{formatAmount(totalBdd)}</p>
              </div>
              <div className={`p-4 rounded-xl border border-(--border) text-center ${Math.abs(gap) < 0.01 ? 'bg-(--success-dim)' : 'bg-(--danger-dim)'}`}>
                <p className="text-[10px] uppercase text-(--muted) mb-1">Écart</p>
                <p className="text-sm font-mono font-bold">{formatAmount(gap)}</p>
              </div>
            </div>

            <textarea
              placeholder="Notes (virement, arrondi...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-4 rounded-xl bg-(--surface) border border-(--border) text-sm h-20 resize-none outline-none"
            />

            <Button variant="primary" size="lg" className="w-full py-4 shadow-lg" disabled={!allFilled || isSaving} onClick={handleSave}>
              {isSaving ? 'Enregistrement…' : 'Valider la régularisation'}
            </Button>

            {saved && <p className="text-center text-sm text-(--success)">Régularisation enregistrée ✓</p>}
            {error && <p className="text-center text-sm text-(--danger)">{error}</p>}

            {/* Historique */}
            {allReguls.length > 0 && (
              <SectionCard title="Historique">
                <div className="flex flex-col gap-2">
                  {[...allReguls].reverse().map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-(--surface2) border border-(--border) text-sm">
                      <span className="text-(--muted) font-mono text-xs">{formatRegulDate(r.createdAt)}</span>
                      <span className="font-mono font-bold">{formatAmount(r.totalReal)}</span>
                      <span className="font-mono text-xs text-(--accent)">{formatAmount(r.totalBdd)}</span>
                      <span className={`font-mono text-xs ${Math.abs(r.gap) < 0.01 ? 'text-(--success)' : 'text-(--danger)'}`}>
                        {r.gap >= 0 ? '+' : ''}{formatAmount(r.gap)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* DROITE : Graphiques */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {chartsData.length < 2 ? (
              <div className="flex items-center justify-center h-48 rounded-xl border border-(--border) bg-(--surface)">
                <p className="text-(--muted) text-sm">Au moins 2 réguls nécessaires pour afficher les graphiques</p>
              </div>
            ) : (
              <>
                <SectionCard title="Fortune Totale">
                  <MultiLineChart data={chartsData} lines={[{ key: 'Fortune', label: 'Total' }]} xKey="date" height={180} />
                </SectionCard>

                <SectionCard title="Par Propriétaire">
                  <MultiLineChart data={chartsData} lines={owners.map(o => ({ key: o, label: o }))} xKey="date" height={180} />
                </SectionCard>

                <SectionCard title="Détail des Comptes">
                  <MultiLineChart data={chartsData} lines={comptes.map(c => ({ key: c.name, label: c.name }))} xKey="date" height={180} />
                </SectionCard>
              </>
            )}
          </div>
        </div>
      </div>
    </ButinLayout>
  )
}
