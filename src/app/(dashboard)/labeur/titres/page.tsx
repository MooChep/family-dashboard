'use client'

import { Crown, Flame, Lock, ShieldAlert, TrendingUp } from 'lucide-react'
import { HONOR_TIERS } from '@/lib/labeur/titles'

/**
 * Page d'information sur les titres d'honneur et la malédiction du Marché.
 */
export default function TitresPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 flex flex-col gap-6">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Crown size={20} />
          Titres & Malédiction
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Comprendre les paliers d'honneur et la mécanique d'inflation
        </p>
      </div>

      {/* ── Titres d'honneur ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Titres d'honneur
        </h2>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Chaque écu gagné compte — même dépenser tes écu ne fait pas régresser ton titre.
          Le titre est calculé sur le total cumulé depuis le début.
        </p>

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* En-tête tableau */}
          <div
            className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
          >
            <span>Seuil</span>
            <span>Masculin / Neutre</span>
            <span>Féminin</span>
          </div>

          {HONOR_TIERS.map((tier, i) => (
            <div
              key={tier.minEcu}
              className="grid grid-cols-3 items-center px-4 py-3.5"
              style={{
                backgroundColor: 'var(--surface)',
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
              }}
            >
              {/* Seuil */}
              <div>
                <span className="text-sm font-mono font-bold" style={{ color: 'var(--accent)' }}>
                  {tier.minEcu}
                </span>
                {tier.maxEcu !== null && (
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                    –{tier.maxEcu}
                  </span>
                )}
                {tier.maxEcu === null && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}> +</span>
                )}
                <span className="text-[10px] ml-1" style={{ color: 'var(--muted)' }}>écu</span>
              </div>

              {/* Titre masculin */}
              <div className="flex items-center gap-1.5">
                {i === HONOR_TIERS.length - 1 && (
                  <Crown size={12} style={{ color: 'var(--accent)' }} />
                )}
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {tier.titleMale}
                </span>
              </div>

              {/* Titre féminin */}
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                {tier.titleFemale}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Le genre du titre se configure dans ton profil (Neutre, Masculin, Féminin).
        </p>
      </section>

      {/* ── Malédiction ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
          <Flame size={12} />
          La malédiction du Marché
        </h2>

        {/* Étapes */}
        <div className="flex flex-col gap-2">

          <Step
            icon={<TrendingUp size={16} style={{ color: '#f59e0b' }} />}
            title="L'inflation monte"
            color="#f59e0b"
          >
            Chaque tâche récurrente en retard fait grimper l'inflation globale du foyer.
            Plus une tâche est en retard, plus sa contribution à l'inflation est importante
            (selon son taux de contribution configuré).
          </Step>

          <Step
            icon={<ShieldAlert size={16} style={{ color: 'var(--danger)' }} />}
            title="Le seuil de malédiction"
            color="var(--danger)"
          >
            Quand l'inflation dépasse le <strong>seuil de malédiction</strong> (configurable dans
            les réglages, 50 % par défaut), les articles du Marché se font <strong>sceller</strong>.
            Un sceau de cire rouge apparaît sur chaque article.
          </Step>

          <Step
            icon={<Lock size={16} style={{ color: 'var(--danger)' }} />}
            title="Articles scellés = achats bloqués"
            color="var(--danger)"
          >
            Tant que la malédiction est active, personne ne peut acheter d'articles
            ni contribuer aux récompenses collectives.
            La seule façon de lever la malédiction est de <strong>compléter les tâches en retard </strong> 
            pour faire baisser l'inflation.
          </Step>

        </div>

        {/* Résumé visuel */}
        <div
          className="rounded-xl px-4 py-4 flex flex-col gap-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
            En bref
          </p>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Retard sur les tâches → inflation haute → malédiction → articles bloqués.<br />
            Compléter les tâches → inflation baisse → malédiction levée → Marché rouvert.
          </p>
        </div>
      </section>

    </div>
  )
}

// ── Composant étape ───────────────────────────────────────────────────────────

function Step({
  icon, title, color, children,
}: {
  icon: React.ReactNode
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 flex gap-3"
      style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--border)` }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}18` }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{children}</p>
      </div>
    </div>
  )
}
