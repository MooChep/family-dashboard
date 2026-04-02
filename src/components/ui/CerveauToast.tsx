'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
type ToastFn = (message: string, kind: 'success' | 'error', undo?: () => Promise<void>) => void

type ToastState = {
  message: string
  kind: 'success' | 'error'
  undo?: () => Promise<void>
  expiresAt: number
} | null

export function useCerveauToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast: ToastFn = useCallback((message, kind, undo) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const duration = undo ? 4000 : 2500
    setToast({ message, kind, undo, expiresAt: Date.now() + duration })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { toast, showToast, dismiss }
}

interface CerveauToastProps {
  toast: ToastState
  onDismiss: () => void
}

export function CerveauToast({ toast, onDismiss }: CerveauToastProps) {
  const [remaining, setRemaining] = useState(4)

  useEffect(() => {
    if (!toast?.undo) return
    const start = Date.now()
    const total = toast.expiresAt - start
    setRemaining(Math.ceil(total / 1000))
    const interval = setInterval(() => {
      const left = toast.expiresAt - Date.now()
      setRemaining(Math.max(0, Math.ceil(left / 1000)))
      if (left <= 0) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [toast])

  if (!toast) return null

  async function handleUndo() {
    onDismiss()
    await toast?.undo?.()
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium"
      style={{
        backgroundColor: toast.kind === 'success' ? 'var(--accent)' : 'var(--danger)',
        color: 'var(--bg)',
        maxWidth: '90vw',
        minWidth: '200px',
      }}
    >
      {toast.kind === 'success'
        ? <CheckCircle size={16} className="shrink-0" />
        : <AlertCircle size={16} className="shrink-0" />
      }
      <span className="flex-1" style={{color: 'var(--surface2)'}}>{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => void handleUndo()}
          className="shrink-0 font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
        >
          Annuler ({remaining}s)
        </button>
      )}
    </div>
  )
}
