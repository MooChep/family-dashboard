'use client'

import { useState, useRef, type ReactElement, type KeyboardEvent } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import { SectionCard } from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths, type TransactionRow } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

export default function AnalysesTagsPage(): ReactElement {
  const [period, setPeriod]         = useState<Period>({ type: 'preset', value: 6 })
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [tagInput, setTagInput]     = useState('')
  const [showSugg, setShowSugg]     = useState(false)
  const [catFilter, setCatFilter]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useAnalyses(period)

  // Période : de PERIOD_START (hardcodé) jusqu'au mois courant
  // On n'attend PAS data pour calculer availableMonths — sinon le PeriodPicker
  // démarre avec une liste vide et n'affiche pas les mois passés.
  const PERIOD_START = '2024-10'
  const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
  const availableMonths = getAvailableMonths(PERIOD_START, currentMonth)

  // Tous les tags connus sur la période
  const allTags = data ? Object.keys(data.txsByTag) : []

  const suggestions = tagInput.trim().length > 0
    ? allTags.filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !searchTags.includes(t))
    : []

  function addSearchTag(tag: string): void {
    const t = tag.trim()
    if (t && !searchTags.includes(t)) setSearchTags((prev) => [...prev, t])
    setTagInput(''); setShowSugg(false)
  }

  function removeSearchTag(tag: string): void {
    setSearchTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addSearchTag(suggestions.length > 0 ? suggestions[0] : tagInput)
    }
    if (e.key === 'Backspace' && tagInput === '' && searchTags.length > 0) {
      setSearchTags((prev) => prev.slice(0, -1))
    }
    if (e.key === 'Escape') setShowSugg(false)
  }

  const categories = data
    ? [...new Set(Object.values(data.txsByTag).flat().map((t) => t.category))]
    : []

  // Transactions qui ont TOUS les searchTags (AND) et correspondent au filtre catégorie
  const matchingTransactions: TransactionRow[] = (() => {
    if (!data || searchTags.length === 0) return []

    // Intersection : transactions présentes dans tous les tags cherchés
    const tagSets = searchTags.map((st) => {
      const matchingTag = allTags.find((t) => t.toLowerCase().includes(st.toLowerCase()))
      return new Set(matchingTag ? (data.txsByTag[matchingTag] ?? []).map((tx) => tx.id) : [])
    })

    const commonIds = tagSets.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))))

    const allTxs = Object.values(data.txsByTag).flat()
    const seen = new Set<string>()
    return allTxs
      .filter((tx) => {
        if (!commonIds.has(tx.id)) return false
        if (catFilter && tx.category !== catFilter) return false
        if (seen.has(tx.id)) return false
        seen.add(tx.id)
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

  // Somme nette des transactions filtrées
  const netTotal = matchingTransactions.reduce(
    (sum, tx) => sum + (tx.isIncome ? tx.amount : -tx.amount),
    0,
  )

  // Vue cards par tag (quand aucun tag cherché)
  const tagCards = data
    ? data.tagsSummary.filter((t) => {
        const matchCat = catFilter === '' || t.category === catFilter
        return matchCat
      })
    : []

  const periodHeader = (
    <PeriodPicker period={period} onChange={setPeriod} availableMonths={availableMonths} />
  )

  return (
    <EpargneLayout>
      <AnalysesLayout subHeader={periodHeader}>

        {/* Recherche multi-tags */}
        <SectionCard title="Recherche par tag">
          <div className="flex gap-3">
            <div className="flex-1" style={{ position: 'relative' }}>
              <div
                className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-10 cursor-text"
                style={{
                  backgroundColor: 'var(--surface2)',
                  border: `1px solid ${showSugg && suggestions.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'border-color 0.15s',
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {searchTags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {tag}
                    <button type="button" onClick={() => removeSearchTag(tag)} style={{ color: 'var(--accent)', lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowSugg(true) }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  placeholder={searchTags.length === 0 ? 'courses, nantes... (Entrée pour combiner)' : ''}
                  className="flex-1 outline-none text-sm bg-transparent min-w-32"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                />
              </div>

              {showSugg && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 rounded-lg overflow-hidden z-50" style={{ top: 'calc(100% + 4px)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto' }}>
                  {suggestions.slice(0, 8).map((s) => {
                    const idx = s.toLowerCase().indexOf(tagInput.toLowerCase())
                    return (
                      <button key={s} type="button" onMouseDown={() => addSearchTag(s)} className="w-full text-left px-3 py-2 text-sm" style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface2)' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                        {s.slice(0, idx)}<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.slice(idx, idx + tagInput.length)}</span>{s.slice(idx + tagInput.length)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              <option value="">Toutes catégories</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {searchTags.length > 1 && (
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Transactions avec <strong style={{ color: 'var(--accent)' }}>tous</strong> les tags : {searchTags.join(' + ')}
            </p>
          )}
        </SectionCard>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
        ) : searchTags.length > 0 ? (

          /* ── Vue tableau : transactions individuelles ── */
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                  {searchTags.join(' + ')}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {matchingTransactions.length} transaction{matchingTransactions.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold" style={{ color: netTotal >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                  {netTotal >= 0 ? '+' : ''}{formatAmount(netTotal)}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>total net</div>
              </div>
            </div>

            {matchingTransactions.length === 0 ? (
              <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>Aucune transaction avec tous ces tags sur cette période</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Mois', 'Catégorie', 'Tags', 'Montant'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchingTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{tx.month}</td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text2)' }}>{tx.category}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {tx.tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: searchTags.some((st) => tag.toLowerCase().includes(st.toLowerCase())) ? 'var(--accent-dim)' : 'var(--surface2)', color: searchTags.some((st) => tag.toLowerCase().includes(st.toLowerCase())) ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right" style={{ color: tx.isIncome ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {tx.isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        ) : tagCards.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {catFilter ? 'Aucun résultat' : 'Aucun tag enregistré sur cette période'}
            </p>
          </div>
        ) : (

          /* ── Vue cards : résumé par tag ── */
          <div className="grid grid-cols-2 gap-4">
            {tagCards.map((t, i) => {
              const netTotal = t.entries.reduce((sum, e) => sum + (e.isIncome ? e.amount : -e.amount), 0)
              const isNet = netTotal >= 0
              return (
                <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{t.tag}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold" style={{ color: isNet ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                        {isNet ? '+' : ''}{formatAmount(netTotal)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.count} op.</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-5 py-3">
                    {t.entries.map((e, j) => (
                      <div key={j} className="flex justify-between items-center px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                        <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{e.month}</span>
                        <span className="text-xs" style={{ color: e.isIncome ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                          {e.isIncome ? '+' : '-'}{formatAmount(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AnalysesLayout>
    </EpargneLayout>
  )
}