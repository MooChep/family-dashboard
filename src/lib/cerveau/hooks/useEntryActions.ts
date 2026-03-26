'use client'

import { useCallback } from 'react'
import type { ApiResponse, EntryWithRelations } from '@/lib/cerveau/types'

export type ToastFn = (
  message: string,
  kind: 'success' | 'error',
  undo?: () => Promise<void>,
) => void

async function api(
  url: string,
  method: string,
  body?: object,
): Promise<{ ok: boolean }> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[useEntryActions] ${method} ${url} → ${res.status}`, text)
    return { ok: false }
  }
  const data = await res.json() as ApiResponse<EntryWithRelations>
  return { ok: !!data.success }
}

export function useEntryActions(refetch: () => void, showToast: ToastFn) {
  const markDone = useCallback(async (id: string) => {
    const { ok } = await api(`/api/cerveau/entries/${id}/done`, 'POST')
    if (ok) {
      refetch()
      showToast('✓ Terminé', 'success')
    } else {
      showToast('Erreur lors de l\'action', 'error')
    }
  }, [refetch, showToast])

  const archive = useCallback(async (id: string) => {
    const { ok } = await api(`/api/cerveau/entries/${id}`, 'DELETE')
    if (ok) {
      refetch()
      showToast('Archivé', 'success', async () => {
        const { ok: undoOk } = await api(
          `/api/cerveau/entries/${id}`,
          'PATCH',
          { status: 'ACTIVE' },
        )
        if (undoOk) refetch()
      })
    } else {
      showToast('Erreur lors de l\'archivage', 'error')
    }
  }, [refetch, showToast])

  const snooze = useCallback(async (id: string, until: Date) => {
    const { ok } = await api(`/api/cerveau/entries/${id}/snooze`, 'POST', {
      until: until.toISOString(),
    })
    if (ok) {
      refetch()
      const h = until.getHours().toString().padStart(2, '0')
      const m = until.getMinutes().toString().padStart(2, '0')
      showToast(`Snoozé jusqu'à ${h}:${m}`, 'success')
    } else {
      showToast('Erreur lors du snooze', 'error')
    }
  }, [refetch, showToast])

  const snooze1h = useCallback(async (id: string) => {
    const until = new Date(Date.now() + 60 * 60 * 1000)
    await snooze(id, until)
  }, [snooze])

  const unarchive = useCallback(async (id: string) => {
    const { ok } = await api(`/api/cerveau/entries/${id}`, 'PATCH', { status: 'ACTIVE' })
    if (ok) {
      refetch()
      showToast('Restauré', 'success')
    } else {
      showToast('Erreur lors de la restauration', 'error')
    }
  }, [refetch, showToast])

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    const { ok } = await api(`/api/cerveau/entries/${id}`, 'PATCH', { pinned })
    if (ok) {
      refetch()
      showToast(pinned ? '📌 Épinglé' : 'Désépinglé', 'success')
    } else {
      showToast('Erreur', 'error')
    }
  }, [refetch, showToast])

  const markTalked = useCallback(async (id: string) => {
    const { ok } = await api(`/api/cerveau/entries/${id}`, 'PATCH', { status: 'DONE' })
    if (ok) {
      refetch()
      showToast('✓ On en a parlé', 'success')
    } else {
      showToast('Erreur', 'error')
    }
  }, [refetch, showToast])

  return { markDone, archive, snooze, snooze1h, unarchive, togglePin, markTalked }
}
