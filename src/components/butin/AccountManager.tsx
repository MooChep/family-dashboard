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

  const border = '1px solid var(--border)'

  return (
    <div className="flex flex-col gap-4">
      {/* ── Comptes actifs ── */}
      <div className="flex flex-col gap-2 w-full">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--muted) font-mono">Comptes bancaires</h3>
        
        <div className="rounded-xl overflow-hidden border border-(--border) bg-(--surface)]">
          {active.length === 0 && !showAdd && (
            <div className="px-4 py-6 text-sm text-(--muted) text-center italic">
              Aucun compte actif
            </div>
          )}

          {active.map((compte, i) => (
            <div 
              key={compte.id} 
              className="flex items-center justify-between px-4 py-3" 
              style={{ borderBottom: i < active.length - 1 || showAdd ? border : 'none' }}
            >
              {editId === compte.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-(--surface2) border border-(--border) outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Propriétaire"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-28 px-3 py-1.5 rounded-lg text-sm bg-(--surface2) border border-(--border) outline-none"
                  />
                  <Button variant="primary" size="sm" isLoading={loading} onClick={() => void handleEdit(compte.id)}>OK</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Annuler</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-(--text2)]">{compte.name}</span>
                    {compte.owner && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-(--surface2) text-(--muted)]">
                        {compte.owner}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditId(compte.id); setEditName(compte.name); setEditOwner(compte.owner || '') }}
                      className="text-xs px-2 py-1 rounded border border-(--border) bg-(--surface2) text-(--muted) hover:text-(--text) transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => void onClose(compte.id)}
                      className="text-xs px-2 py-1 rounded border transition-colors shadow-sm"
                      style={{ 
                        color: 'var(--warning)', 
                        backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)', 
                        borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)' 
                      }}
                    >
                      Fermer
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Formulaire ajout intégré en bas de la liste */}
          {showAdd && (
            <div className="px-4 py-3 flex items-center gap-3 bg-(--surface2)]/50">
              <input
                autoFocus
                placeholder="Nom (ex: Livret A)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-(--bg) border border-(--border) outline-none"
              />
              <input
                placeholder="Propriétaire"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="w-32 px-3 py-1.5 rounded-lg text-sm bg-(--bg) border border-(--border) outline-none"
              />
              <Button variant="primary" size="sm" isLoading={loading} onClick={() => void handleAdd()}>Ajouter</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Annuler</Button>
            </div>
          )}
        </div>

        {!showAdd && (
          <Button variant="discrete" size="sm" className="w-fit" onClick={() => { setShowAdd(true); setError(null) }}>
            + Nouveau compte
          </Button>
        )}
        {error && <p className="text-xs text-(--danger) px-1">{error}</p>}
      </div>

      {/* ── Comptes fermés ── */}
      {closed.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-widest text-(--muted) font-mono mb-2"
          >
            {showClosed ? '▾' : '▸'} {closed.length} compte{closed.length > 1 ? 's' : ''} fermé{closed.length > 1 ? 's' : ''}
          </button>
          {showClosed && (
            <div className="rounded-xl overflow-hidden border border-(--border) bg-(--surface) opacity-70">
              {closed.map((compte, i) => (
                <div key={compte.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < closed.length - 1 ? border : 'none' }}>
                  <span className="text-sm line-through text-(--muted)]">{compte.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void onReopen(compte.id)}
                      className="text-xs px-2 py-1 rounded border transition-colors"
                      style={{ 
                        color: 'var(--success)', 
                        backgroundColor: 'color-mix(in srgb, var(--success) 10%, transparent)', 
                        borderColor: 'color-mix(in srgb, var(--success) 30%, transparent)' 
                      }}
                    >
                      Rouvrir
                    </button>
                    <button
                      onClick={() => void onDelete(compte.id)}
                      className="text-xs px-2 py-1 rounded border transition-colors"
                      style={{ 
                        color: 'var(--danger)', 
                        backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)', 
                        borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' 
                      }}
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