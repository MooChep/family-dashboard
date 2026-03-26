'use client'

import { useState, useEffect, useMemo } from 'react'
import { searchEntries, type SearchResult } from '@/lib/cerveau/search'
import type { EntryWithRelations } from '@/lib/cerveau/types'

export type { SearchResult }

export function useSearch(entries: EntryWithRelations[]) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo(
    () => debouncedQuery.trim().length < 2 ? [] : searchEntries(entries, debouncedQuery),
    [entries, debouncedQuery],
  )

  function clear() {
    setQuery('')
    setDebouncedQuery('')
  }

  return {
    query,
    setQuery,
    results,
    isSearching: query.trim().length >= 2,
    clear,
  }
}
