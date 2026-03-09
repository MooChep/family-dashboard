'use client'
import { useState, useEffect, useRef, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { type Category, type SavingsProject, CategoryType } from '@prisma/client'

interface TagRow { tag: string; count: number }
type ProjetRow = SavingsProject & { allocations: { amount: number }[], transferredToId?: string | null }

interface CategoryManagerProps {
  categories: Category[]
  projets: ProjetRow[]
  mode?: 'revenus' | 'fixes' | 'variables' | 'projets' | 'tags' | 'all'
  onAdd: (data: { name: string; type: CategoryType; isFixed: boolean }) => Promise<void>
  onEdit: (id: string, data: { name: string; isFixed: boolean; isArchived?: boolean }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddProjet: (name: string, targetAmount: number | null) => Promise<void>
  onEditProjet: (id: string, name: string, targetAmount: number | null) => Promise<void>
  onReaffecterProjet: (sourceId: string, targetProjectId: string) => Promise<void>
  onAnnulerReaffectation: (sourceId: string) => Promise<void>
}

function CategoryGroup({ title, items, onEdit, onToggleArchive, deletingId }: any) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--muted) font-mono">{title}</h3>
      <div className="rounded-xl overflow-hidden border border-(--border) bg-(--surface)]">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-(--muted) italic">Aucune catégorie</p>
        ) : (
          items.map((cat: any, i: number) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-(--text2)]">{cat.name}</span>
                {cat.isFixed && <Badge variant="default">fixe</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(cat)}
                  className="text-xs px-2 py-1 rounded border border-(--border) bg-(--surface2) text-(--muted) hover:text-(--text) transition-colors"
                >
                  Modifier
                </button>
                <button
                  disabled={deletingId === cat.id}
                  onClick={() => onToggleArchive(cat)}
                  className="text-xs px-2 py-1 rounded border transition-colors shadow-sm disabled:opacity-50"
                  style={{ 
                    color: cat.isArchived ? 'var(--success)' : 'var(--warning)', 
                    backgroundColor: `color-mix(in srgb, var(${cat.isArchived ? '--success' : '--warning'}) 10%, transparent)`, 
                    borderColor: `color-mix(in srgb, var(${cat.isArchived ? '--success' : '--warning'}) 30%, transparent)` 
                  }}
                >
                  {cat.isArchived ? 'Restaurer' : 'Archiver'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function CategoryManager({
  categories, projets, mode = 'all',
  onAdd, onEdit, onAddProjet, onEditProjet,
}: CategoryManagerProps): ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>(CategoryType.EXPENSE)
  const [isFixed, setIsFixed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [tags, setTags] = useState<TagRow[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const [isProjetModalOpen, setIsProjetModalOpen] = useState(false)
  const [editingProjet, setEditingProjet] = useState<ProjetRow | null>(null)
  const [projetName, setProjetName] = useState('')
  const [projetTarget, setProjetTarget] = useState('')

  async function loadTags() {
    setTagsLoading(true)
    try {
      const res = await fetch('/api/epargne/tags')
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } finally { setTagsLoading(false) }
  }

  useEffect(() => { if (mode === 'all' || mode === 'tags') void loadTags() }, [mode])

  const startRename = (tag: string) => {
    setRenamingTag(tag); setRenameValue(tag)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const saveRename = async (oldTag: string) => {
    const newTag = renameValue.trim()
    if (!newTag || newTag === oldTag) { setRenamingTag(null); return }
    try {
      await fetch('/api/epargne/tags', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTag, newTag }),
      })
      await loadTags()
    } finally { setRenamingTag(null) }
  }

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`Supprimer le tag "${tag}" ?`)) return
    try {
      await fetch('/api/epargne/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag }) })
      await loadTags()
    } catch {}
  }

  const openAdd = () => { setEditingCategory(null); setName(''); setType(CategoryType.EXPENSE); setIsFixed(false); setIsModalOpen(true) }
  const openEdit = (cat: Category) => { setEditingCategory(cat); setName(cat.name); setType(cat.type); setIsFixed(cat.isFixed); setIsModalOpen(true) }
  
  const handleToggleArchive = async (cat: Category) => {
    setDeletingId(cat.id)
    try { await onEdit(cat.id, { name: cat.name, isFixed: cat.isFixed, isArchived: !cat.isArchived }) }
    finally { setDeletingId(null) }
  }

  const activeCats = categories.filter(c => !c.isArchived && c.type !== 'PROJECT')

  return (
    <div className="flex flex-col gap-6">
      {(mode === 'all' || mode === 'revenus') && (
        <div className="flex flex-col gap-4">
          <CategoryGroup title="Revenus" items={activeCats.filter(c => c.type === 'INCOME')} onEdit={openEdit} onToggleArchive={handleToggleArchive} deletingId={deletingId} />
          <Button variant="discrete" size="sm" className="w-fit" onClick={() => { openAdd(); setType(CategoryType.INCOME); }}>+ Ajouter un revenu</Button>
        </div>
      )}

      {(mode === 'all' || mode === 'fixes') && (
        <div className="flex flex-col gap-4">
          <CategoryGroup title="Charges Fixes" items={activeCats.filter(c => c.type === 'EXPENSE' && c.isFixed)} onEdit={openEdit} onToggleArchive={handleToggleArchive} deletingId={deletingId} />
          <Button variant="discrete" size="sm" className="w-fit" onClick={() => { openAdd(); setIsFixed(true); setType(CategoryType.EXPENSE); }}>+ Ajouter une charge fixe</Button>
        </div>
      )}

      {(mode === 'all' || mode === 'variables') && (
        <div className="flex flex-col gap-4">
          <CategoryGroup title="Dépenses Variables" items={activeCats.filter(c => c.type === 'EXPENSE' && !c.isFixed)} onEdit={openEdit} onToggleArchive={handleToggleArchive} deletingId={deletingId} />
          <Button variant="discrete" size="sm" className="w-fit" onClick={() => { openAdd(); setIsFixed(false); setType(CategoryType.EXPENSE); }}>+ Ajouter une dépense</Button>
        </div>
      )}

      {(mode === 'all' || mode === 'projets') && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--muted) font-mono">Projets d'épargne</h3>
            <div className="rounded-xl overflow-hidden border border-(--border) bg-(--surface)]">
              {projets.length === 0 ? <p className="px-4 py-3 text-sm text-(--muted) italic">Aucun projet</p> : projets.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < projets.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex flex-col">
                      <span className="text-sm font-medium text-(--text2)]">{p.name}</span>
                      <span className="text-[10px] text-(--muted) font-mono">{p.currentAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingProjet(p); setProjetName(p.name); setProjetTarget(p.targetAmount ? String(p.targetAmount) : ''); setIsProjetModalOpen(true); }}
                      className="text-xs px-2 py-1 rounded border border-(--border) bg-(--surface2) text-(--muted) hover:text-(--text) transition-colors"
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button variant="discrete" size="sm" className="w-fit" onClick={() => { setEditingProjet(null); setProjetName(''); setProjetTarget(''); setIsProjetModalOpen(true); }}>+ Nouveau projet</Button>
        </div>
      )}

      {(mode === 'all' || mode === 'tags') && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-(--muted) font-mono">Tags</h3>
          <div className="rounded-xl overflow-hidden border border-(--border) bg-(--surface)]">
            <div className="px-4 py-3 border-b border-(--border) bg-(--surface2)]/50">
              <input value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="Filtrer les tags..." className="w-full bg-transparent text-sm outline-none" />
            </div>
            {tagsLoading ? <p className="p-4 text-sm text-(--muted)]">Chargement...</p> : 
             tags.filter(t => t.tag.toLowerCase().includes(tagSearch.toLowerCase())).map((row, i, arr) => (
              <div key={row.tag} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-center flex-wrap gap-3">
                  {renamingTag === row.tag ? (
                    <input ref={renameInputRef} value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => saveRename(row.tag)} onKeyDown={e => e.key === 'Enter' && saveRename(row.tag)} className="px-2 py-0.5 rounded text-sm bg-(--surface2) border border-(--accent) outline-none" />
                  ) : (
                    <Badge className="font-mono">{row.tag}</Badge>
                  )}
                  <span className="text-[10px] text-(--muted) font-mono">{row.count} transactions</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startRename(row.tag)}
                    className="text-xs px-2 py-1 rounded border border-(--border) bg-(--surface2) text-(--muted) hover:text-(--text) transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteTag(row.tag)}
                    className="text-xs px-2 py-1 rounded border transition-colors shadow-sm"
                    style={{ 
                      color: 'var(--danger)', 
                      backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)', 
                      borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' 
                    }}
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? "Modifier catégorie" : "Nouvelle catégorie"}>
        <div className="flex flex-col gap-4 pt-2">
          <Input label="Nom" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <Button variant="primary" className="w-full" onClick={async () => {
            setIsSaving(true);
            if (editingCategory) await onEdit(editingCategory.id, { name, isFixed })
            else await onAdd({ name, type, isFixed })
            setIsSaving(false); setIsModalOpen(false);
          }} isLoading={isSaving}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal isOpen={isProjetModalOpen} onClose={() => setIsProjetModalOpen(false)} title="Projet d'épargne">
        <div className="flex flex-col gap-4 pt-2">
          <Input label="Nom" value={projetName} onChange={e => setProjetName(e.target.value)} />
          <Input label="Objectif (€)" value={projetTarget} onChange={e => setProjetTarget(e.target.value)} />
          <Button variant="primary" className="w-full" onClick={async () => {
            const target = projetTarget ? parseFloat(projetTarget) : null
            if (editingProjet) await onEditProjet(editingProjet.id, projetName, target)
            else await onAddProjet(projetName, target)
            setIsProjetModalOpen(false);
          }}>Enregistrer le projet</Button>
        </div>
      </Modal>
    </div>
  )
}