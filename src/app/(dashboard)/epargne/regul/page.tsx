'use client'
import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { Button } from '@/components/ui/Button'
import { formatAmount } from '@/lib/formatters'
import { type BankAccount, type Category } from '@prisma/client'
import { TransactionForm } from '@/components/epargne/TransactionForm'
import { MultiLineChart, SectionCard } from '@/components/epargne/analyses/AnalysesCharts'

interface ReconciliationEntry { accountId: string; balance: number; account: BankAccount }
interface Reconciliation {
  id: string
  month: string
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
function prevMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
function nextMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
function formatMonth(iso: string): string {
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const [y, m] = iso.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

export default function RegulPage(): ReactElement {
  const currentMonth = getCurrentMonth()
  const [selectedMonth, setSelectedMonth]   = useState(currentMonth)
  const [comptes, setComptes]               = useState<BankAccount[]>([])
  const [regul, setRegul]                   = useState<Reconciliation | null>(null)
  const [allReguls, setAllReguls]           = useState<Reconciliation[]>([])
  const [totalBdd, setTotalBdd]             = useState(0)
  const [balances, setBalances]             = useState<Record<string, string>>({})
  const [note, setNote]                     = useState('')
  const [isLoading, setIsLoading]           = useState(true)
  const [isSaving, setIsSaving]             = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [showTxForm, setShowTxForm]         = useState(false)
  const [categories, setCategories]         = useState<Category[]>([])
  const [existingTags, setExistingTags]     = useState<string[]>([])

  const loadAll = useCallback(async (month: string): Promise<void> => {
    setIsLoading(true)
    const [comptesRes, regulRes, allRegulsRes, projetsRes, catsRes, tagsRes] = await Promise.all([
      fetch('/api/epargne/comptes'),
      fetch(`/api/epargne/regul?month=${month}`),
      fetch('/api/epargne/regul'),
      fetch('/api/epargne/projets'),
      fetch('/api/epargne/categories'),
      fetch('/api/epargne/tags'),
    ])
    
    const comptesData = await comptesRes.json() as BankAccount[]
    const regulData = await regulRes.json() as Reconciliation | null
    const allRegulsData = await allRegulsRes.json() as Reconciliation[]
    const projetsData = await projetsRes.json() as { currentAmount: number; isActive: boolean }[]

    setComptes(comptesData.filter((c) => c.isActive))
    setTotalBdd(projetsData.filter((p) => p.isActive).reduce((s, p) => s + p.currentAmount, 0))
    setRegul(regulData)
    setAllReguls(allRegulsData)
    setCategories(await catsRes.json() as Category[])
    setExistingTags(await tagsRes.json() as string[])

    const init: Record<string, string> = {}
    for (const c of comptesData.filter((c) => c.isActive)) {
      const existing = regulData?.entries.find((e) => e.accountId === c.id)
      init[c.id] = existing ? existing.balance.toFixed(2) : ''
    }
    setBalances(init)
    setNote(regulData?.note ?? '')
    setIsLoading(false)
  }, [])

  useEffect(() => { void loadAll(selectedMonth) }, [selectedMonth, loadAll])

  const entries = comptes.map((c) => ({
    accountId: c.id,
    balance: parseFloat(balances[c.id]?.replace(',', '.') ?? '0') || 0,
  }))
  const totalReal = entries.reduce((s, e) => s + e.balance, 0)
  const gap = totalReal - totalBdd
  const allFilled = comptes.length > 0 && comptes.every((c) => balances[c.id]?.trim() !== '')
  const isComplete = regul !== null

  async function handleSave(): Promise<void> {
    setIsSaving(true); setError(null)
    try {
      const res = await fetch('/api/epargne/regul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, entries, note }),
      })
      if (!res.ok) throw new Error('Erreur de sauvegarde')
      await loadAll(selectedMonth)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setIsSaving(false) }
  }

  // ── Préparation des Graphiques ──
  const sortedReguls = [...allReguls].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  const owners = [...new Set(comptes.map((c) => c.owner).filter(Boolean))]

  const chartsData = sortedReguls.map((r) => {
    const mk = new Date(r.month)
    const label = MONTHS_SHORT[mk.getMonth()] + ' ' + String(mk.getFullYear()).slice(2)
    
    const row: any = { month: label, Fortune: r.totalReal }
    
    // Data par propriétaire
    owners.forEach(owner => {
      row[owner] = r.entries
        .filter(e => e.account.owner === owner)
        .reduce((sum, e) => sum + e.balance, 0)
    })

    // Data par compte
    comptes.forEach(c => {
      const entry = r.entries.find(e => e.accountId === c.id)
      row[c.name] = entry?.balance ?? 0
    })

    return row
  })

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-8 pb-24 pt-15 md:pt-0">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedMonth(m => prevMonth(m))} className="w-12 h-12 rounded-xl flex items-center justify-center bg-(--surface) border border-(--border) text-xl">‹</button>
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{formatMonth(selectedMonth)}</h2>
              <p className="text-xs text-(--muted)]">Régularisation mensuelle</p>
            </div>
            <button 
              onClick={() => setSelectedMonth(m => nextMonth(m))} 
              disabled={selectedMonth >= currentMonth}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-(--surface) border border-(--border) text-xl disabled:opacity-30"
            >›</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* GAUCHE : Saisie & Chiffres */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <SectionCard title="Soldes réels">
              <div className="flex flex-col gap-3">
                {comptes.map((compte) => (
                  <div key={compte.id} className="flex items-center justify-between p-3 rounded-xl bg-(--surface2) border border-(--border)]">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{compte.name}</span>
                      <span className="text-[10px] text-(--muted) uppercase tracking-wider">{compte.owner}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={balances[compte.id] ?? ''}
                        onChange={(e) => setBalances(prev => ({ ...prev, [compte.id]: e.target.value }))}
                        className="w-28 md:w-32 px-3 py-2 rounded-lg text-right font-mono text-sm bg-(--surface) border border-(--border) focus:border-(--accent) outline-none"
                      />
                    </div>
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
                <p className="text-sm font-mono font-bold text-(--accent)]">{formatAmount(totalBdd)}</p>
              </div>
              <div className={`p-4 rounded-xl border border-(--border) text-center ${Math.abs(gap) < 0.01 ? 'bg-(--success-dim)]' : 'bg-(--danger-dim)]'}`}>
                <p className="text-[10px] uppercase text-(--muted) mb-1">Écart</p>
                <p className="text-sm font-mono font-bold">{formatAmount(gap)}</p>
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full py-4 shadow-lg" disabled={!allFilled || isSaving} onClick={handleSave}>
              {isComplete ? 'Mettre à jour' : 'Valider la régularisation'}
            </Button>

            <textarea
              placeholder="Notes (virement, arrondi...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-4 rounded-xl bg-(--surface) border border-(--border) text-sm h-20 resize-none outline-none"
            />
          </div>

          {/* DROITE : Les 3 Graphiques */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            <SectionCard title="Fortune Totale">
              <MultiLineChart data={chartsData} lines={[{ key: 'Fortune', label: 'Total' }]} height={180} />
            </SectionCard>

            <SectionCard title="Par Propriétaire">
              <MultiLineChart data={chartsData} lines={owners.map(o => ({ key: o, label: o }))} height={180} />
            </SectionCard>

            <SectionCard title="Détail des Comptes">
              <MultiLineChart data={chartsData} lines={comptes.map(c => ({ key: c.name, label: c.name }))} height={180} />
            </SectionCard>

          </div>
        </div>
      </div>

      <TransactionForm
        isOpen={showTxForm}
        onClose={() => setShowTxForm(false)}
        onSave={async () => {}}
        categories={categories}
        existingTags={existingTags}
        defaultAmount={Math.abs(gap).toFixed(2)}
      />
    </EpargneLayout>
  )
}