import { TaskForm } from '@/components/labeur/tasks/TaskForm'

export const metadata = { title: 'Nouvelle tâche · Labeur' }

/**
 * Page de création d'une nouvelle tâche Labeur.
 */
export default function NouvelleTachePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          Nouvelle tâche
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Définis une corvée récurrente ou une tâche ponctuelle.
        </p>
      </div>
      <TaskForm />
    </div>
  )
}
