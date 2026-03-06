'use client'

import { useState, useRef, useEffect, useCallback, type ReactElement, type KeyboardEvent } from 'react'
import { AnalysesLayout } from '@/components/epargne/analyses/AnalysesLayout'
import { PeriodPicker, type Period } from '@/components/epargne/analyses/PeriodPicker'
import { SectionCard } from '@/components/epargne/analyses/AnalysesCharts'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAnalyses, getAvailableMonths, type TransactionRow } from '@/hooks/useAnalyses'
import { formatAmount } from '@/lib/formatters'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'

function useDropdownPosition(anchorRef: React.RefObject<HTMLElement>, isOpen: boolean) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const update = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [anchorRef])

  useEffect(() => {
    if (!isOpen) { setPos(null); return }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen, update])

  return pos
}

export default function AnalysesTagsPage(): ReactElement {
  const [period, setPeriod]         = useState<Period>({ type: 'preset', value: 6 })
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [tagInput, setTagInput]     = useState('')
  const [showSugg, setShowSugg]     = useState(false)
  const [catFilter, setCatFilter]   = useState('')
  const inputRef   = useRef<HTMLInputElement>(null)
  const anchorRef  = useRef<HTMLDivElement>(null)

  const dropdownPos = useDropdownPosition(anchorRef as React.RefObject<HTMLElement>, showSugg)

  const { data, isLoading } = useAnalyses(period)

  const PERIOD_START = '2024-10'
  const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')
  const availableMonths = getAvailableMonths(PERIOD_START, currentMonth)

  const allTags = data ? Object.keys(data.txsByTag) : []

  // Construit la liste des catégories depuis txsByTag (et non tagsSummary)
  // pour inclure toutes les catégories réelles, y compris les projets d'épargne
  const categories = data
    ? [...new Set(Object.values(data.txsByTag).flat().map((t) => t.category))].sort()
    : []

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

  const matchingTransactions: TransactionRow[] = (() => {
    if (!data || searchTags.length === 0) return []
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

  const netTotal = matchingTransactions.reduce(
    (sum, tx) => sum + (tx.isIncome ? tx.amount : -tx.amount),
    0,
  )

  // Filtre les cards par catégorie en utilisant txsByTag comme source de vérité
  const tagCards = data
    ? data.tagsSummary.filter((t) => {
        if (catFilter === '') return true
        // Vérifie si ce tag a au moins une transaction dans la catégorie filtrée
        const txsForTag = data.txsByTag[t.tag] ?? []
        return txsForTag.some((tx) => tx.category === catFilter)
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

            {/* Anchor wrapper — utilisé pour calculer la position du dropdown */}
            <div className="flex-1" ref={anchorRef}>
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

        {/* Dropdown suggestions — position fixe pour ne pas être clippé */}
        {showSugg && suggestions.length > 0 && dropdownPos && (
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              borderRadius: '0.5rem',
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 9999,
            }}
          >
            {suggestions.slice(0, 8).map((s) => {
              const idx = s.toLowerCase().indexOf(tagInput.toLowerCase())
              return (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => addSearchTag(s)}
                  className="w-full text-left px-3 py-2 text-sm"
                  style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {s.slice(0, idx)}<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.slice(idx, idx + tagInput.length)}</span>{s.slice(idx + tagInput.length)}
                </button>
              )
            })}
          </div>
        )}

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
              // Filtre les entries par catégorie si un filtre est actif
              const filteredEntries = catFilter
                ? (data?.txsByTag[t.tag] ?? [])
                    .filter((tx) => tx.category === catFilter)
                    .map((tx) => ({ month: tx.month, amount: tx.amount, isIncome: tx.isIncome }))
                : t.entries
              const cardNet = filteredEntries.reduce((sum, e) => sum + (e.isIncome ? e.amount : -e.amount), 0)
              const isNet = cardNet >= 0
              return (
                <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-base font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{t.tag}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {catFilter || t.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold" style={{ color: isNet ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                        {isNet ? '+' : ''}{formatAmount(cardNet)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{filteredEntries.length} op.</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-5 py-3">
                    {filteredEntries.map((e, j) => (
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