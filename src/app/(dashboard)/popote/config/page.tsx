'use client'

import { useState } from 'react'
import { DictionaryView }  from '@/components/popote/config/DictionaryView'
import { AislesConfig }    from '@/components/popote/config/AislesConfig'
import { SubstitutionRules } from '@/components/popote/import/SubstitutionRules'

type Tab = 'dictionary' | 'aisles' | 'substitutions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dictionary',    label: 'Dictionnaire'   },
  { id: 'aisles',        label: 'Rayons'         },
  { id: 'substitutions', label: 'Substitutions'  },
]

/**
 * Page configuration Popote — 3 onglets :
 *   Dictionnaire (CRUD ingrédients + fusion)
 *   Rayons (réordonnancement)
 *   Substitutions permanentes
 */
export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('dictionary')

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="flex items-center px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Configuration
        </h1>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 font-mono text-xs font-medium transition-colors"
            style={{
              color:       tab === t.id ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
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
