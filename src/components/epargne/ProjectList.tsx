'use client'

import { type ReactElement } from 'react'
import { ProjectCard } from './ProjectCard'
import { type SavingsProject, type SavingsAllocation } from '@prisma/client'

type ProjectWithAllocations = SavingsProject & {
  allocations: SavingsAllocation[]
}

interface ProjectListProps {
  projects: ProjectWithAllocations[]
  onReaffecter?: (projectId: string) => void
}

export function ProjectList({
  projects,
  onReaffecter,
}: ProjectListProps): ReactElement {
  if (projects.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucun projet d'épargne actif
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onReaffecter={onReaffecter}
        />
      ))}
    </div>
  )
}