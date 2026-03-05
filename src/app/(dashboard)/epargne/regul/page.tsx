'use client'
import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { Button } from '@/components/ui/Button'
import { formatAmount } from '@/lib/formatters'
import { type BankAccount, type Category } from '@prisma/client'
import { TransactionForm } from '@/components/epargne/TransactionForm'
import { MultiLineChart, SectionCard } from '@/components/epargne/analyses/AnalysesCharts'

interface ReconciliationEntry { accountId: string; balance: number }
interface Reconciliation {
  id: string
  month: string
  totalReal: number
  totalBdd: number
  gap: number
  note: string | null
  entries: { accountId: string; balance: number; account: BankAccount }[]
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function prevMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`
}
function nextMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, '0')}`
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

  // Charge les comptes, toutes les réguls (graphique), et la régul du mois sélectionné
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
    const comptesData  = await comptesRes.json()  as BankAccount[]
    const regulData    = await regulRes.json()    as Reconciliation | null
    const allRegulsData= await allRegulsRes.json() as Reconciliation[]
    const projetsData  = await projetsRes.json()  as { currentAmount: number; isActive: boolean }[]

    const bdd = projetsData.filter((p) => p.isActive).reduce((s, p) => s + p.currentAmount, 0)
    setComptes(comptesData.filter((c) => c.isActive))
    setTotalBdd(bdd)
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

  function handlePrev(): void { setSelectedMonth((m) => prevMonth(m)) }
  function handleNext(): void {
    if (selectedMonth < currentMonth) setSelectedMonth((m) => nextMonth(m))
  }

  const entries: ReconciliationEntry[] = comptes.map((c) => ({
    accountId: c.id,
    balance: parseFloat(balances[c.id]?.replace(',', '.') ?? '0') || 0,
  }))
  const totalReal = entries.reduce((s, e) => s + e.balance, 0)
  const gap = totalReal - totalBdd
  const allFilled = comptes.every((c) => balances[c.id]?.trim() !== '')
  const isComplete = regul !== null
  const isCurrentMonth = selectedMonth === currentMonth

  async function handleSave(): Promise<void> {
    setIsSaving(true); setError(null)
    try {
      const res = await fetch('/api/epargne/regul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, entries, note }),
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      await loadAll(selectedMonth)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveAdjustment(data: { categoryId: string; amount: number; tags: string[]; pointed: boolean }): Promise<void> {
    const txRes = await fetch('/api/epargne/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: selectedMonth, ...data }),
    })
    if (!txRes.ok) throw new Error('Erreur création transaction')
    const tx = await txRes.json() as { id: string }
    const regulRes = await fetch('/api/epargne/regul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: selectedMonth, entries, note, adjustmentId: tx.id }),
    })
    if (!regulRes.ok) throw new Error('Erreur mise à jour régul')
    await loadAll(selectedMonth)
    setShowTxForm(false)
  }

  // ── Données graphique — solde par compte à travers les réguls ────────────
  const sortedReguls = [...allReguls].sort((a, b) =>
    new Date(a.month).getTime() - new Date(b.month).getTime()
  )
  const allAccountIds = comptes.map((c) => c.id)
  const chartData = sortedReguls.map((r) => {
    const mk = new Date(r.month)
    const row: Record<string, string | number> = {
      month: MONTHS_SHORT[mk.getMonth()] + ' ' + String(mk.getFullYear()).slice(2),
    }
    for (const c of comptes) {
      const entry = r.entries.find((e) => e.accountId === c.id)
      row[c.name] = entry?.balance ?? 0
    }
    return row
  })
  const chartLines = comptes.map((c) => ({ key: c.name, label: c.name }))

  // Graphique cumul par propriétaire
  const owners = [...new Set(comptes.map((c) => c.owner).filter(Boolean))]
  const ownerChartData = sortedReguls.map((r) => {
    const mk = new Date(r.month)
    const row: Record<string, string | number> = {
      month: MONTHS_SHORT[mk.getMonth()] + ' ' + String(mk.getFullYear()).slice(2),
    }
    for (const owner of owners) {
      const ownerAccounts = comptes.filter((c) => c.owner === owner)
      row[owner] = ownerAccounts.reduce((sum, c) => {
        const entry = r.entries.find((e) => e.accountId === c.id)
        return sum + (entry?.balance ?? 0)
      }, 0)
    }
    return row
  })
  const ownerChartLines = owners.map((o) => ({ key: o, label: o }))

  const border = '1px solid var(--border)'

  return (
    <EpargneLayout>
      <div className="flex flex-col gap-6">

        {/* ── Navigation mois ── */}
        <div className="flex items-center gap-4">
          <button onClick={handlePrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--surface)', border, color: 'var(--text2)' }}>
            ‹
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              Régularisation — {formatMonth(selectedMonth)}
            </h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Compare tes soldes réels avec la fortune totale calculée
            </p>
          </div>
          <button onClick={handleNext}
            disabled={selectedMonth >= currentMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'var(--surface)', border,
              color: selectedMonth >= currentMonth ? 'var(--muted)' : 'var(--text2)',
              opacity: selectedMonth >= currentMonth ? 0.4 : 1,
            }}>
            ›
          </button>
          {isComplete && (
            <span className="ml-2 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              ✓ Régul effectuée
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* ── Colonne gauche : formulaire ── */}
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Chargement…</p>
              </div>
            ) : comptes.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Aucun compte actif — crée tes comptes dans l'onglet <strong>Gestion</strong>
                </p>
              </div>
            ) : (
              <>
                {/* Saisie des soldes */}
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border }}>
                  <div className="px-5 py-4" style={{ borderBottom: border }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                      Soldes réels
                    </h3>
                  </div>
                  {comptes.map((compte, i) => (
                    <div key={compte.id}
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderBottom: i < comptes.length - 1 ? border : 'none' }}>
                      <span className="text-sm" style={{ color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>
                        {compte.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={balances[compte.id] ?? ''}
                          onChange={(e) => setBalances((prev) => ({ ...prev, [compte.id]: e.target.value }))}
                          className="w-36 px-3 py-1.5 rounded-lg text-sm text-right outline-none"
                          style={{ backgroundColor: 'var(--surface2)', border, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>€</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparaison */}
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: border }}>
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>Total comptes réels</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatAmount(totalReal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: border }}>
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>Fortune totale (projets)</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {formatAmount(totalBdd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Écart</span>
                    <span className="text-lg font-semibold" style={{
                      color: Math.abs(gap) < 0.01 ? 'var(--success)' : 'var(--danger)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {gap >= 0 ? '+' : ''}{formatAmount(gap)}
                    </span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    Note (optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Virement oublié, arrondi de change…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{ backgroundColor: 'var(--surface)', border, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                  />
                </div>

                {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="primary" size="md" isLoading={isSaving} disabled={!allFilled}
                    onClick={() => void handleSave()}>
                    {isComplete ? 'Mettre à jour' : 'Valider la régul'}
                  </Button>
                  {allFilled && Math.abs(gap) > 0.01 && (
                    <Button variant="ghost" size="md" onClick={() => setShowTxForm(true)}>
                      Créer une transaction de régul
                    </Button>
                  )}
                </div>

                <TransactionForm
                  isOpen={showTxForm}
                  onClose={() => setShowTxForm(false)}
                  onSave={handleSaveAdjustment}
                  categories={categories}
                  existingTags={existingTags}
                  defaultCategoryName="Régularisation"
                  defaultAmount={Math.abs(gap).toFixed(2)}
                  defaultTags={['regul']}
                />
              </>
            )}
          </div>

          {/* ── Colonne droite : graphiques ── */}
          <div className="flex flex-col gap-4">

            {/* Cumul par propriétaire */}
            {ownerChartData.length > 0 && owners.length > 0 && (
              <SectionCard title="Total par propriétaire">
                <MultiLineChart
                  data={ownerChartData}
                  lines={ownerChartLines}
                  height={220}
                  formatter={(v, name) => [
                    v !== undefined ? formatAmount(v as number) : '—',
                    name as string,
                  ]}
                />
              </SectionCard>
            )}

            {/* Soldes par compte */}
            {chartData.length > 0 ? (
              <SectionCard title="Évolution des soldes par compte">
                <MultiLineChart
                  data={chartData}
                  lines={chartLines}
                  height={280}
                  formatter={(v, name) => [
                    v !== undefined ? formatAmount(v as number) : '—',
                    name as string,
                  ]}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Chaque point correspond à une régul effectuée
                </p>
              </SectionCard>
            ) : (
              <div className="rounded-xl p-8 flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface)', border }}>
                <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
                  Le graphique apparaîtra après la première régul
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </EpargneLayout>
  )
}