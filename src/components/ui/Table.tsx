import { type ReactNode, type ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface TableProps {
  children: ReactNode
  className?: string
}

interface TableHeadProps {
  children: ReactNode
}

interface ThProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

interface TdProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  muted?: boolean
}

const ALIGN_CLASSES: Record<string, string> = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
}

export function Table({ children, className }: TableProps): ReactElement {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse', className)}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: TableHeadProps): ReactElement {
  return (
    <thead
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </thead>
  )
}

export function Th({
  children,
  className,
  align = 'left',
}: ThProps): ReactElement {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wider',
        ALIGN_CLASSES[align],
        className,
      )}
      style={{ color: 'var(--muted)' }}
    >
      {children}
    </th>
  )
}

export function TableBody({ children }: TableHeadProps): ReactElement {
  return <tbody>{children}</tbody>
}

export function Tr({ children }: TableHeadProps): ReactElement {
  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  className,
  align = 'left',
  muted = false,
}: TdProps): ReactElement {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm',
        ALIGN_CLASSES[align],
        className,
      )}
      style={{ color: muted ? 'var(--muted)' : 'var(--text2)' }}
    >
      {children}
    </td>
  )
}