'use client'

import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { ConfirmDialog } from '@/components/gamelle/shared/ConfirmDialog'

type SubRule = {
  id:          string
  jowName:     string
  referenceId: string
  reference:   { id: string; name: string; baseUnit: string }
  createdAt:   string
}

/**
 * Liste des règles de substitution permanentes Jow → référence interne.
 * Permet de supprimer une règle.
 */
export function SubstitutionRules() {
  const [rules,   setRules]   = useState<SubRule[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SubRule | null>(null)
  const [search,        setSearch]        = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/substitutions')
      const data = await res.json() as SubRule[]
      setRules(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/gamelle/substitutions/${id}`, { method: 'DELETE' })
      setRules(prev => prev.filter(r => r.id !== id))
    } catch { /* ignore */ } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <p className="font-mono text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>
        Chargement…
      </p>
    )
  }

  if (rules.length === 0) {
    return (
      <p className="font-mono text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>
        Aucune substitution permanente
      </p>
    )
  }

  const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filteredRules = search.trim()
    ? rules.filter(r =>
        normalizeStr(r.jowName).includes(normalizeStr(search)) ||
        normalizeStr(r.reference.name).includes(normalizeStr(search))
      )
    : rules

  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
        Substitutions permanentes ({rules.length})
      </p>
      <input
        type="search"
        placeholder="Rechercher…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg font-body text-sm outline-none mb-2"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
      />
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {filteredRules.length === 0 && (
          <p className="font-mono text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>
            Aucun résultat
          </p>
        )}
        {filteredRules.map((rule, i) => (
          <div
            key={rule.id}
            className="flex items-center gap-3 px-3 py-2.5"
            style={{
              borderBottom: i < filteredRules.length - 1 ? '1px solid var(--border)' : 'none',
              background:   'var(--surface2)',
            }}
          >
            <span className="font-body text-sm truncate" style={{ color: 'var(--muted)', textDecoration: 'line-through', minWidth: 0, flex: 1 }}>
              {rule.jowName}
            </span>
            <ArrowRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span className="font-body text-sm truncate" style={{ color: 'var(--text)', minWidth: 0, flex: 1 }}>
              {rule.reference.name}
            </span>
            <button
              onClick={() => setPendingDelete(rule)}
              disabled={deleting === rule.id}
              className="shrink-0 p-1 rounded-lg disabled:opacity-40"
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          message={`Supprimer la substitution ?`}
          detail={`« ${pendingDelete.jowName} » → « ${pendingDelete.reference.name} »`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { void handleDelete(pendingDelete.id); setPendingDelete(null) }}
        />
      )}
    </div>
  )
}
