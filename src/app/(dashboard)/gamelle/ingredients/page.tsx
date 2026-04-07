'use client'

import { useState } from 'react'
import { DictionaryView }  from '@/components/gamelle/config/DictionaryView'
import { AislesConfig }    from '@/components/gamelle/config/AislesConfig'
import { SubstitutionRules } from '@/components/gamelle/import/SubstitutionRules'
import { Layers } from 'lucide-react'

type Tab = 'dictionary' | 'aisles' | 'substitutions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dictionary',    label: 'Ingrédients' },
  { id: 'aisles',        label: 'Rayons'      },
  { id: 'substitutions', label: 'Substitutions' },
]

/**
 * Page de gestion des ingrédients et rayons — accessible depuis la BottomNav Config.
 */
export default function IngredientsPage() {
  const [tab, setTab] = useState<Tab>('dictionary')

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Layers size={18} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold leading-none" style={{ color: 'var(--text)' }}>
            Dictionnaire
          </h1>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Ingrédients · Rayons · Substitutions
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 font-mono text-xs font-medium transition-colors"
            style={{
              color:        tab === t.id ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto pb-24">
        {tab === 'dictionary'    && <DictionaryView />}
        {tab === 'aisles'        && <AislesConfig />}
        {tab === 'substitutions' && (
          <div className="px-4 py-4">
            <SubstitutionRules />
          </div>
        )}
      </div>
    </div>
  )
}
