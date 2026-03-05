'use client'
import { useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { type BankAccount } from '@prisma/client'

interface AccountManagerProps {
  comptes: BankAccount[]
  onAdd: (name: string, owner: string) => Promise<void>
  onEdit: (id: string, name: string, owner: string) => Promise<void>
  onClose: (id: string) => Promise<void>
  onReopen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function AccountManager({ comptes, onAdd, onEdit, onClose, onReopen, onDelete }: AccountManagerProps): ReactElement {
  const [showAdd, setShowAdd]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [newOwner, setNewOwner]     = useState('')
  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editOwner, setEditOwner]   = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  const active = comptes.filter((c) => c.isActive)
  const closed = comptes.filter((c) => !c.isActive)

  async function handleAdd(): Promise<void> {
    if (!newName.trim()) return
    setLoading(true); setError(null)
    try { await onAdd(newName.trim(), newOwner.trim()); setNewName(''); setNewOwner(''); setShowAdd(false) }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }

  async function handleEdit(id: string): Promise<void> {
    if (!editName.trim()) return
    setLoading(true); setError(null)
    try { await onEdit(id, editName.trim(), editOwner.trim()); setEditId(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }

  const row = 'flex items-center justify-between px-4 py-3'
  const border = '1px solid var(--border)'

  return (
    <div className="flex flex-col gap-4">
      {/* ── Comptes actifs ── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: border }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            Comptes bancaires
          </h3>
          <Button variant="ghost" size="sm" onClick={() => { setShowAdd(true); setError(null) }}>
            + Nouveau compte
          </Button>
        </div>

        {/* Formulaire ajout */}
        {showAdd && (
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: border, backgroundColor: 'var(--surface2)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Nom du compte (ex: Livret A)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg)', border, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
            />
            <input
              type="text"
              placeholder="Propriétaire (ex: Ilan)"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
              className="w-32 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg)', border, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
            />
            <Button variant="primary" size="sm" isLoading={loading} onClick={() => void handleAdd()}>Ajouter</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Annuler</Button>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-xs" style={{ color: 'var(--danger)', borderBottom: border }}>{error}</div>
        )}

        {active.length === 0 && !showAdd && (
          <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--muted)' }}>
            Aucun compte — ajoute ton premier compte ci-dessus
          </div>
        )}

        {active.map((compte, i) => (
          <div key={compte.id} className={row} style={{ borderBottom: i < active.length - 1 ? border : 'none' }}>
            {editId === compte.id ? (
              <div className="flex items-center gap-3 flex-1">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleEdit(compte.id); if (e.key === 'Escape') setEditId(null) }}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface2)', border, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                />
                <input
                  type="text"
                  placeholder="Propriétaire"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleEdit(compte.id); if (e.key === 'Escape') setEditId(null) }}
                  className="w-28 px-3 py-1.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface2)', border, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
                />
                <Button variant="primary" size="sm" isLoading={loading} onClick={() => void handleEdit(compte.id)}>OK</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Annuler</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                    {compte.name}
                  </span>
                  {compte.owner && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {compte.owner}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditId(compte.id); setEditName(compte.name) }}
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--muted)', backgroundColor: 'var(--surface2)', border }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => void onClose(compte.id)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: 'var(--warning)', backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)' }}
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Comptes fermés ── */}
      {closed.length > 0 && (
        <div>
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="text-xs mb-2"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showClosed ? '▾' : '▸'} {closed.length} compte{closed.length > 1 ? 's' : ''} fermé{closed.length > 1 ? 's' : ''}
          </button>
          {showClosed && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border, opacity: 0.7 }}>
              {closed.map((compte, i) => (
                <div key={compte.id} className={row} style={{ borderBottom: i < closed.length - 1 ? border : 'none' }}>
                  <span className="text-sm line-through" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                    {compte.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void onReopen(compte.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--success)', backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)' }}
                    >
                      Rouvrir
                    </button>
                    <button
                      onClick={() => void onDelete(compte.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--danger)', backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}