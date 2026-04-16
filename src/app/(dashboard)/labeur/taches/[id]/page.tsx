'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Trash2, RefreshCw, CalendarClock, Users } from 'lucide-react'
import Link from 'next/link'
import { TaskForm } from '@/components/labeur/tasks/TaskForm'
import { CompletionButton } from '@/components/labeur/tasks/CompletionButton'
import { SharedTaskBadge } from '@/components/labeur/tasks/SharedTaskBadge'
import { formatRelative } from '@/lib/formatDate'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

type Params = { id: string }

/**
 * Page détail d'une tâche Labeur.
 * Affiche les informations complètes, l'historique de completions et permet l'édition / archivage.
 */
export default function TacheDetailPage({ params }: { params: Params }) {
  const { id }           = params
  const router           = useRouter()
  const { data: session } = useSession()

  const [task,    setTask]    = useState<LabeurTaskWithRelations | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  async function fetchTask() {
    const res = await fetch(`/api/labeur/tasks/${id}`)
    if (res.ok) {
      const { data } = await res.json()
      setTask(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchTask() }, [id])

  // onSuccess est appelé par CompletionButton après que l'API a déjà été contactée
  function handleCompletionSuccess() {
    void fetchTask()
  }

  async function handleArchive() {
    if (!confirm('Archiver cette tâche ? Elle ne sera plus visible dans la liste active.')) return
    setDeleting(true)
    const res = await fetch(`/api/labeur/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/labeur/taches')
    } else {
      alert('Erreur lors de l\'archivage')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p style={{ color: 'var(--danger)' }}>Tâche introuvable.</p>
        <Link href="/labeur/taches" className="text-sm mt-4 block" style={{ color: 'var(--accent)' }}>
          ← Retour aux tâches
        </Link>
      </div>
    )
  }

  const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
  const alreadyDone   = task.completions.some(
    (c) => c.userId === session?.user?.id && new Date(c.completedAt) > new Date(instanceStart)
  )

  const inflationState = task.inflationStates[0]
  const daysOverdue    = inflationState?.daysOverdue ?? 0

  // Récupérer les completions de l'instance courante pour l'historique
  const currentCompletions = task.completions.filter(
    (c) => new Date(c.completedAt) > new Date(instanceStart)
  )

  if (editing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(false)} style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Modifier la tâche</h1>
        </div>
        <TaskForm
          taskId={task.id}
          initialValues={{
            title:               task.title,
            description:         task.description ?? undefined,
            type:                task.type,
            isShared:            task.isShared,
            ecuValue:            task.ecuValue,
            inflationContribRate: task.inflationContribRate,
            dueDate:             task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : undefined,
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 flex flex-col gap-5">

      {/* ── Navigation ── */}
      <div className="flex items-center gap-3">
        <Link href="/labeur/taches" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold flex-1 truncate" style={{ color: 'var(--text)' }}>
          {task.title}
        </h1>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
        >
          Modifier
        </button>
      </div>

      {/* ── Carte de synthèse ── */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{
          backgroundColor: 'var(--surface)',
          border: daysOverdue > 0
            ? `1px solid ${daysOverdue >= 3 ? 'var(--danger)' : '#f59e0b'}40`
            : '1px solid var(--border)',
        }}
      >
        {/* Valeur + type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.type === 'RECURRING'
              ? <RefreshCw    size={16} style={{ color: 'var(--accent)' }} />
              : <CalendarClock size={16} style={{ color: 'var(--muted)' }} />
            }
            <span className="text-sm" style={{ color: 'var(--text2)' }}>
              {task.type === 'RECURRING' ? 'Récurrente' : 'Ponctuelle'}
            </span>
          </div>
          <span className="text-xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
            {task.ecuValue} écu
          </span>
        </div>

        {/* Récurrence / dueDate */}
        {task.recurrence && (
          <div className="text-sm" style={{ color: 'var(--text2)' }}>
            Prochaine échéance :{' '}
            <span style={{ color: 'var(--text)' }}>
              {new Date(task.recurrence.nextDueAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </span>
            {daysOverdue > 0 && (
              <span
                className="ml-2 font-semibold"
                style={{ color: daysOverdue >= 3 ? 'var(--danger)' : '#f59e0b' }}
              >
                ({daysOverdue}j de retard)
              </span>
            )}
          </div>
        )}
        {task.dueDate && (
          <div className="text-sm" style={{ color: 'var(--text2)' }}>
            Date limite :{' '}
            <span style={{ color: 'var(--text)' }}>
              {new Date(task.dueDate).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {task.isShared && (
            <>
              <span
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              >
                <Users size={9} /> Partagée
              </span>
              <SharedTaskBadge task={task} currentUserId={session?.user?.id ?? ''} />
            </>
          )}
          {inflationState && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: 'var(--danger)',
              }}
            >
              +{Math.round(inflationState.inflationPercent)} % inflation
            </span>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm" style={{ color: 'var(--text2)' }}>{task.description}</p>
        )}

        {/* Bouton complétion */}
        <div className="flex justify-end pt-1">
          <CompletionButton
            taskId={task.id}
            disabled={alreadyDone || task.status === 'ARCHIVED'}
            onSuccess={handleCompletionSuccess}
          />
        </div>
      </div>

      {/* ── Completions de l'instance courante ── */}
      {currentCompletions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
            Instance courante
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {currentCompletions.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < currentCompletions.length - 1 ? '1px solid var(--border)' : undefined }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {(c as typeof c & { user?: { name: string } }).user?.name?.charAt(0) ?? '?'}
                </div>
                <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
                  {(c as typeof c & { user?: { name: string } }).user?.name ?? 'Membre'}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {formatRelative(new Date(c.completedAt))}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                  +{c.ecuAwarded} écu
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Actions ── */}
      {task.status !== 'ARCHIVED' && (
        <button
          onClick={handleArchive}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--border)' }}
        >
          <Trash2 size={15} />
          {deleting ? 'Archivage…' : 'Archiver la tâche'}
        </button>
      )}

    </div>
  )
}
