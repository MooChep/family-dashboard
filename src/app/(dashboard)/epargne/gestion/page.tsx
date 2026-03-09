'use client'
import { useState, useEffect, type ReactElement } from 'react'
import { EpargneLayout } from '@/components/epargne/EpargneLayout'
import { CategoryManager } from '@/components/epargne/CategoryManager'
import { AccountManager } from '@/components/epargne/AccountManager'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, Lock, ShoppingBag, Target, Tag, Banknote } from 'lucide-react'

export default function GestionPage(): ReactElement {
  const [categories, setCategories] = useState([])
  const [projets, setProjets] = useState([])
  const [comptes, setComptes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState('sec-rev')

  async function loadAll() {
    const [catRes, projRes, comptesRes] = await Promise.all([
      fetch('/api/epargne/categories?includeArchived=true'),
      fetch('/api/epargne/projets'),
      fetch('/api/epargne/comptes'),
    ])
    setCategories(await catRes.json())
    setProjets(await projRes.json())
    setComptes(await comptesRes.json())
    setIsLoading(false)
  }

  useEffect(() => { void loadAll() }, [])

const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  const nav = document.querySelector('nav') // Barre 1
  const aside = document.querySelector('aside') // Barre 2
  
  if (element) {
    // On calcule la hauteur combinée des deux barres sticky
    const totalStickyHeight = (nav?.clientHeight || 0) + (aside?.clientHeight || 0)
    
    window.scrollTo({
      top: element.offsetTop - totalStickyHeight - 20, // -20 pour un peu d'air
      behavior: 'smooth'
    })
    setActiveId(id)
  }
}

  const commonProps = {
    categories, projets,
    onAdd: async (d: any) => { await fetch('/api/epargne/categories', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }); loadAll() },
    onEdit: async (id: string, d: any) => { await fetch(`/api/epargne/categories/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) }); loadAll() },
    onDelete: async (id: string) => { await fetch(`/api/epargne/categories/${id}`, { method: 'DELETE' }); loadAll() },
    onAddProjet: async (n: string, t: any) => { await fetch('/api/epargne/projets', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: n, targetAmount: t}) }); loadAll() },
    onEditProjet: async (id: string, n: string, t: any) => { await fetch(`/api/epargne/projets/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: n, targetAmount: t}) }); loadAll() },
    onReaffecterProjet: async (s: string, t: string) => { await fetch(`/api/epargne/projets/${s}/reaffecter`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({targetProjectId: t}) }); loadAll() },
    onAnnulerReaffectation: async (s: string) => { await fetch(`/api/epargne/projets/${s}/reaffecter`, { method: 'DELETE' }); loadAll() },
  }

  const SECTIONS = [
    { id: 'sec-rev', label: 'Revenus', icon: TrendingUp, mode: 'revenus' },
    { id: 'sec-fix', label: 'Fixes', icon: Lock, mode: 'fixes' },
    { id: 'sec-var', label: 'Variables', icon: ShoppingBag, mode: 'variables' },
    { id: 'sec-prj', label: 'Projets', icon: Target, mode: 'projets' },
    { id: 'sec-tag', label: 'Tags', icon: Tag, mode: 'tags' },
    { id: 'sec-cpt', label: 'Comptes', icon: Banknote, mode: null },
  ]

  return (
    <EpargneLayout
      stickySubHeader={
        <div className="flex items-center  justify-between gap-2 flex-wrap no-scrollbar py-1">
          {SECTIONS.map((s) => (
            <button 
  key={s.id} 
  onClick={() => scrollTo(s.id)}
  className={cn(
    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black border uppercase transition-all",
    activeId === s.id 
      ? "bg-(--accent) text-white border-(--accent)]" // FORCE TEXTE BLANC
      : "bg-(--surface) text-(--text2) border-(--border)]"
  )}
>
  <s.icon size={12} /> {s.label}
</button>
          ))}
        </div>
      }
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-3 md:gap-20">
        {isLoading ? <div className="p-8"><SkeletonCard /></div> : (
          <>
            <section id="sec-rev" className="scroll-mt-40"><CategoryManager {...commonProps} mode="revenus" /></section>
            <section id="sec-fix" className="scroll-mt-40 border-t pt-5 border-(--border)]"><CategoryManager {...commonProps} mode="fixes" /></section>
            <section id="sec-var" className="scroll-mt-40 border-t pt-5 border-(--border)]"><CategoryManager {...commonProps} mode="variables" /></section>
            <section id="sec-prj" className="scroll-mt-40 border-t pt-5 border-(--border)]"><CategoryManager {...commonProps} mode="projets" /></section>
            <section id="sec-tag" className="scroll-mt-40 border-t pt-5 border-(--border)]"><CategoryManager {...commonProps} mode="tags" /></section>
            <section id="sec-cpt" className="scroll-mt-40 border-t pt-5 border-(--border) pb-20">
            <AccountManager comptes={comptes} onAdd={async (n, o) => {}} onEdit={async (id, n, o) => {}} onClose={async (id) => {}} onReopen={async (id) => {}} onDelete={async (id) => {}} />
            </section>
          </>
        )}
      </div>
    </EpargneLayout>
  )
}