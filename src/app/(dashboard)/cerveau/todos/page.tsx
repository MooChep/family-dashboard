import { type ReactElement } from 'react'
import { TodoList } from '@/components/cerveau/todos/TodoList'

export const metadata = { title: 'Todos · Cerveau' }

/** Page /cerveau/todos — liste complète des todos avec filtres. */
export default function TodosPage(): ReactElement {
  return (
    <div style={{ padding: '0 16px 100px' }}>

      {/* ── En-tête ── */}
      <div style={{ padding: '16px 0 12px' }}>
        <h1
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '14px',
            fontWeight:    700,
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin:        0,
          }}
        >
          ◻ Todos
        </h1>
      </div>

      <TodoList />

    </div>
  )
}
