'use client'

import { useState, useEffect, useRef, type ReactElement, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { type Category, type SavingsProject, CategoryType } from '@prisma/client'

// --- Types et Interfaces ---
interface TagRow { tag: string; count: number }
type ProjetRow = SavingsProject & { allocations: { amount: number }[], transferredToId?: string | null }

interface CategoryManagerProps {
  categories: Category[]
  projets: ProjetRow[]
  onAdd: (data: { name: string; type: CategoryType; isFixed: boolean }) => Promise<void>
  onEdit: (id: string, data: { name: string; isFixed: boolean; isArchived?: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddProjet: (name: string, targetAmount: number | null) => Promise<void>
  onEditProjet: (id: string, name: string, targetAmount: number | null) => Promise<void>
  onReaffecterProjet: (sourceId: string, targetProjectId: string) => Promise<void>
  onAnnulerReaffectation: (sourceId: string) => Promise<void>
}

// --- Sous-composant (DÉPLACÉ ICI HORS DE CategoryManager) ---
function CategoryGroup({ 
  title, 
  items, 
  archived = false, 
  readOnly = false,
  onEdit,
  onToggleArchive,
  onDelete,
  deletingId 
}: { 
  title: string; 
  items: Category[]; 
  archived?: boolean; 
  readOnly?: boolean;
  onEdit: (cat: Category) => void;
  onToggleArchive: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  deletingId: string | null;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        {title}
      </h3>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Aucune catégorie</p>
        ) : (
          items.map((cat, i) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', opacity: cat.isArchived ? 0.6 : 1 }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text2)' }}>{cat.name}</span>
                {cat.isFixed && <Badge variant="default">fixe</Badge>}
                {cat.isArchived && <Badge variant="warning">archivée</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && !cat.isArchived && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(cat)}>Modifier</Button>
                )}
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={deletingId === cat.id}
                    onClick={() => onToggleArchive(cat)}
                  >
                    {cat.isArchived ? 'Restaurer' : 'Archiver'}
                  </Button>
                )}
                {!readOnly && !cat.isArchived && (
                  <Button variant="danger" size="sm" isLoading={deletingId === cat.id} onClick={() => onDelete(cat)}>
                    Supprimer
                  </Button>
                )}
                {readOnly && (
                  <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    géré via Projets
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// --- Composant Principal ---
export function CategoryManager({
  categories, projets,
  onAdd, onEdit, onDelete,
  onAddProjet, onEditProjet, onReaffecterProjet, onAnnulerReaffectation,
}: CategoryManagerProps): ReactElement {
  // ... (Garder tous les states et handlers identiques à ton code original)
  const [isModalOpen, setIsModalOpen]       = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName]       = useState('')
  const [type, setType]       = useState<CategoryType>(CategoryType.EXPENSE)
  const [isFixed, setIsFixed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  // Tags
  const [tags, setTags]           = useState<TagRow[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [deletingTag, setDeletingTag] = useState<string | null>(null)
  const [tagSearch, setTagSearch]    = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Projets
  const [isProjetModalOpen, setIsProjetModalOpen]   = useState(false)
  const [editingProjet, setEditingProjet]           = useState<ProjetRow | null>(null)
  const [projetName, setProjetName]                 = useState('')
  const [projetTarget, setProjetTarget]             = useState('')
  const [projetSaving, setProjetSaving]             = useState(false)
  const [projetError, setProjetError]               = useState<string | null>(null)
  const [reaffectSource, setReaffectSource]         = useState<ProjetRow | null>(null)
  const [reaffectTarget, setReaffectTarget]         = useState('')
  const [reaffectSaving, setReaffectSaving]         = useState(false)
  const [reaffectError, setReaffectError]           = useState<string | null>(null)

  // ... (Garder loadTags, useEffect, openAdd, openEdit, handleSubmit, handleDelete, handleToggleArchive, 
  // startRename, saveRename, handleDeleteTag, handleRenameKey, openAddProjet, openEditProjet, 
  // handleSubmitProjet, handleAnnulerReaffectation, handleReaffecter)

  async function loadTags(): Promise<void> {
    setTagsLoading(true)
    try {
      const res = await fetch('/api/epargne/tags')
      const data = await res.json() as TagRow[]
      setTags(Array.isArray(data) ? data : [])
    } finally { setTagsLoading(false) }
  }
  useEffect(() => { void loadTags() }, [])

  function openAdd(): void {
    setEditingCategory(null); setName(''); setType(CategoryType.EXPENSE); setIsFixed(false); setFormError(null); setIsModalOpen(true)
  }
  function openEdit(cat: Category): void {
    setEditingCategory(cat); setName(cat.name); setType(cat.type); setIsFixed(cat.isFixed); setFormError(null); setIsModalOpen(true)
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) { setFormError('Le nom est requis'); return }
    setIsSaving(true); setFormError(null)
    try {
      if (editingCategory) { await onEdit(editingCategory.id, { name: name.trim(), isFixed }) }
      else { await onAdd({ name: name.trim(), type, isFixed }) }
      setIsModalOpen(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally { setIsSaving(false) }
  }

  async function handleDelete(cat: Category): Promise<void> {
    setDeletingId(cat.id)
    try { await onDelete(cat.id) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
    finally { setDeletingId(null) }
  }

  async function handleToggleArchive(cat: Category): Promise<void> {
    setDeletingId(cat.id)
    try { await onEdit(cat.id, { name: cat.name, isFixed: cat.isFixed, isArchived: !cat.isArchived }) }
    finally { setDeletingId(null) }
  }

  function startRename(tag: string): void {
    setRenamingTag(tag); setRenameValue(tag)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  async function saveRename(oldTag: string): Promise<void> {
    const newTag = renameValue.trim()
    if (!newTag || newTag === oldTag) { setRenamingTag(null); return }
    setRenameLoading(true)
    try {
      await fetch('/api/epargne/tags', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTag, newTag }),
      })
      await loadTags()
    } finally { setRenameLoading(false); setRenamingTag(null) }
  }

  async function handleDeleteTag(tag: string): Promise<void> {
    if (!confirm(`Supprimer le tag "${tag}" de toutes les transactions ?`)) return
    setDeletingTag(tag)
    try {
      await fetch('/api/epargne/tags', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      await loadTags()
    } finally { setDeletingTag(null) }
  }

  function handleRenameKey(e: KeyboardEvent<HTMLInputElement>, oldTag: string): void {
    if (e.key === 'Enter') void saveRename(oldTag)
    if (e.key === 'Escape') setRenamingTag(null)
  }

  function openAddProjet(): void {
    setEditingProjet(null); setProjetName(''); setProjetTarget(''); setProjetError(null); setIsProjetModalOpen(true)
  }
  function openEditProjet(p: ProjetRow): void {
    setEditingProjet(p); setProjetName(p.name); setProjetTarget(p.targetAmount ? String(p.targetAmount) : ''); setProjetError(null); setIsProjetModalOpen(true)
  }
  async function handleSubmitProjet(): Promise<void> {
    if (!projetName.trim()) { setProjetError('Le nom est requis'); return }
    const target = projetTarget.trim() ? parseFloat(projetTarget.replace(',', '.')) : null
    setProjetSaving(true); setProjetError(null)
    try {
      if (editingProjet) { await onEditProjet(editingProjet.id, projetName.trim(), target) }
      else { await onAddProjet(projetName.trim(), target) }
      setIsProjetModalOpen(false)
    } catch (e) { setProjetError(e instanceof Error ? e.message : 'Erreur') }
    finally { setProjetSaving(false) }
  }
  async function handleAnnulerReaffectation(sourceId: string): Promise<void> {
    if (!window.confirm('Annuler cette réaffectation ? Le montant sera restitué au projet source.')) return
    try { await onAnnulerReaffectation(sourceId) } catch (e) { alert(e instanceof Error ? e.message : 'Erreur') }
  }

  async function handleReaffecter(): Promise<void> {
    if (!reaffectSource || !reaffectTarget) { setReaffectError('Sélectionne un projet cible'); return }
    setReaffectSaving(true); setReaffectError(null)
    try {
      await onReaffecterProjet(reaffectSource.id, reaffectTarget)
      setReaffectSource(null); setReaffectTarget('')
    } catch (e) { setReaffectError(e instanceof Error ? e.message : 'Erreur') }
    finally { setReaffectSaving(false) }
  }

  // --- Groupes ---
  const activeCats      = categories.filter((c) => !c.isArchived && c.type !== 'PROJECT')
  const archivedCats    = categories.filter((c) => c.isArchived)
  const incomeCategories   = activeCats.filter((c) => c.type === 'INCOME')
  const fixedCategories    = activeCats.filter((c) => c.type === 'EXPENSE' && c.isFixed)
  const variableCategories = activeCats.filter((c) => c.type === 'EXPENSE' && !c.isFixed)
  const filteredTags = tags.filter((t) => tagSearch === '' || t.tag.toLowerCase().includes(tagSearch.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: showArchived ? 'var(--accent-dim)' : 'var(--surface)', border: '1px solid var(--border)', color: showArchived ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}
        >
          {showArchived ? 'Masquer archivées' : `Voir archivées (${archivedCats.length})`}
        </button>
        <Button variant="primary" size="md" onClick={openAdd}>+ Nouvelle catégorie</Button>
      </div>

      <CategoryGroup title="Revenus" items={incomeCategories} deletingId={deletingId} onEdit={openEdit} onToggleArchive={handleToggleArchive} onDelete={handleDelete} />
      <CategoryGroup title="Charges fixes" items={fixedCategories} deletingId={deletingId} onEdit={openEdit} onToggleArchive={handleToggleArchive} onDelete={handleDelete} />
      <CategoryGroup title="Dépenses variables" items={variableCategories} deletingId={deletingId} onEdit={openEdit} onToggleArchive={handleToggleArchive} onDelete={handleDelete} />

      {/* --- Section Projets d'épargne --- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Projets d'épargne
          </h3>
          <Button variant="ghost" size="sm" onClick={openAddProjet}>+ Nouveau projet</Button>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {projets.length === 0 ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Aucun projet</p>
          ) : projets.map((p, i, arr) => {
            const transferTarget = !p.isActive ? projets.find((t) => t.id === p.transferredToId) : null
            return (
            <div key={p.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', opacity: p.isActive ? 1 : 0.65 }}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>{p.name}</span>
                  {!p.isActive && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>inactif</span>}
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {p.currentAmount.toFixed(2)} €{p.targetAmount ? ` / ${p.targetAmount.toFixed(2)} €` : ''}
                  {transferTarget && ` → ${transferTarget.name}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {p.isActive && <Button variant="ghost" size="sm" onClick={() => openEditProjet(p)}>Modifier</Button>}
                {p.isActive && <Button
                  variant="ghost" size="sm"
                  onClick={() => { setReaffectSource(p); setReaffectTarget(''); setReaffectError(null) }}
                  style={{ color: 'var(--accent)' }}
                >
                  Réaffecter →
                </Button>}
                {!p.isActive && p.transferredToId && (
                  <Button variant="ghost" size="sm" onClick={() => void handleAnnulerReaffectation(p.id)} style={{ color: 'var(--warning)' }}>
                    ↩ Annuler
                  </Button>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>

      {showArchived && archivedCats.length > 0 && (
        <CategoryGroup title="Archivées" items={archivedCats} archived deletingId={deletingId} onEdit={openEdit} onToggleArchive={handleToggleArchive} onDelete={handleDelete} />
      )}

      {/* --- Tags --- */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Tags</h3>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Filtrer les tags..." className="w-full px-3 py-1.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          {tagsLoading ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Chargement...</p>
          ) : filteredTags.length === 0 ? (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{tagSearch ? 'Aucun résultat' : 'Aucun tag'}</p>
          ) : filteredTags.map((row, i) => (
            <div key={row.tag} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < filteredTags.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {renamingTag === row.tag ? (
                  <input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => handleRenameKey(e, row.tag)} onBlur={() => saveRename(row.tag)} className="px-2 py-0.5 rounded text-sm outline-none" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', fontFamily: 'var(--font-mono)', width: 160 }} />
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{row.tag}</span>
                )}
                <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{row.count} tx</span>
              </div>
              <div className="flex items-center gap-2">
                {renamingTag === row.tag ? (
                  <>
                    <Button variant="primary" size="sm" isLoading={renameLoading} onClick={() => saveRename(row.tag)}>OK</Button>
                    <Button variant="ghost" size="sm" onClick={() => setRenamingTag(null)}>Annuler</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => startRename(row.tag)}>Renommer</Button>
                    <Button variant="danger" size="sm" isLoading={deletingTag === row.tag} onClick={() => handleDeleteTag(row.tag)}>Supprimer</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={isProjetModalOpen} onClose={() => setIsProjetModalOpen(false)} title={editingProjet ? 'Modifier le projet' : "Nouveau projet d'épargne"}>
        <div className="flex flex-col gap-4">
          <Input label="Nom" value={projetName} onChange={(e) => setProjetName(e.target.value)} placeholder="Ex: Mariage" autoFocus />
          <Input label="Objectif (€) — optionnel" type="text" inputMode="decimal" value={projetTarget} onChange={(e) => setProjetTarget(e.target.value)} placeholder="Ex: 5000" />
          {!editingProjet && <p className="text-xs" style={{ color: 'var(--muted)' }}>Une catégorie homonyme sera créée automatiquement.</p>}
          {projetError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{projetError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsProjetModalOpen(false)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={projetSaving} onClick={handleSubmitProjet}>{editingProjet ? 'Modifier' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={reaffectSource !== null} onClose={() => setReaffectSource(null)} title={`Réaffecter — ${reaffectSource?.name ?? ''}`}>
        <div className="flex flex-col gap-4">
          {reaffectSource && (
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Solde à transférer</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{reaffectSource.currentAmount.toFixed(2)} €</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Projet cible</label>
            <div className="flex flex-col gap-1">
              {projets.filter((p) => p.isActive && p.id !== reaffectSource?.id).map((p) => (
                <button key={p.id} type="button" onClick={() => setReaffectTarget(p.id)} className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: reaffectTarget === p.id ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${reaffectTarget === p.id ? 'var(--accent)' : 'var(--border)'}`, color: reaffectTarget === p.id ? 'var(--accent)' : 'var(--text)' }}>
                  <span>{p.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{p.currentAmount.toFixed(2)} €{p.targetAmount ? ` / ${p.targetAmount.toFixed(2)} €` : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Le projet <strong style={{ color: 'var(--text)' }}>{reaffectSource?.name}</strong> sera marqué comme terminé et sa catégorie archivée.
          </p>
          {reaffectError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{reaffectError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setReaffectSource(null)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={reaffectSaving} disabled={!reaffectTarget} onClick={handleReaffecter}>Confirmer le transfert</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
        <div className="flex flex-col gap-4">
          <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Courses" />
          {!editingCategory && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text2)' }}>Type</label>
              <div className="flex gap-2">
                {[{ value: CategoryType.INCOME, label: 'Revenu' }, { value: CategoryType.EXPENSE, label: 'Dépense' }].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setType(opt.value)} className="flex-1 py-2 rounded-lg text-sm" style={{ backgroundColor: type === opt.value ? 'var(--accent)' : 'var(--surface2)', color: type === opt.value ? 'var(--bg)' : 'var(--text2)', border: '1px solid var(--border)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === CategoryType.EXPENSE && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsFixed(!isFixed)} className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: isFixed ? 'var(--accent)' : 'var(--surface2)', border: `1px solid ${isFixed ? 'var(--accent)' : 'var(--border)'}`, color: isFixed ? 'var(--bg)' : 'transparent' }}>
                {isFixed && '✓'}
              </button>
              <span className="text-sm" style={{ color: 'var(--text2)' }}>Charge fixe récurrente</span>
            </div>
          )}
          {formError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{formError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="md" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button variant="primary" size="md" isLoading={isSaving} onClick={handleSubmit}>{editingCategory ? 'Modifier' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}