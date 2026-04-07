'use client'

interface ConfirmDialogProps {
  message:   string
  detail?:   string
  onConfirm: () => void
  onCancel:  () => void
}

/**
 * Dialogue de confirmation centré sur l'écran.
 * Usage : afficher avant toute suppression destructive.
 */
export function ConfirmDialog({ message, detail, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
      />

      {/* Dialog */}
      <div
        style={{
          position:     'fixed',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          zIndex:       61,
          width:        'min(320px, calc(100vw - 32px))',
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: 16,
          padding:      20,
        }}
      >
        <p className="font-display text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
          {message}
        </p>
        {detail && (
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {detail}
          </p>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl font-mono text-xs"
            style={{ color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl font-mono text-xs font-medium"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </>
  )
}
