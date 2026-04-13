'use client'

/**
 * Sceau de cire rouge — affiché en superposition sur les articles scellés par la malédiction.
 * Visuellement distinctif : cercle rouge orné, texte "Scellé" + % inflation actuel.
 */
export function WaxSeal({ inflationPercent, curseSeuil }: { inflationPercent: number; curseSeuil: number }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)' }}
    >
      {/* Sceau circulaire */}
      <div
        className="flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-lg"
        style={{
          background:  'radial-gradient(circle at 40% 35%, #dc2626, #7f1d1d)',
          border:      '3px solid #ef4444',
          boxShadow:   '0 0 0 2px #7f1d1d, 0 4px 16px rgba(220,38,38,0.5)',
        }}
      >
        {/* Ornement intérieur */}
        <div
          className="absolute w-16 h-16 rounded-full"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        />
        <span className="text-xs font-bold text-white/90 uppercase tracking-widest leading-none">
          Scellé
        </span>
        <span className="text-[9px] text-white/70 mt-0.5">
          {Math.round(inflationPercent)} % / {curseSeuil} %
        </span>
      </div>
    </div>
  )
}
