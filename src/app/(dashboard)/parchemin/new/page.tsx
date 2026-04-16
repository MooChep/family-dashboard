'use client'

import { useRouter } from 'next/navigation'
import { NewNoteModal } from '@/components/parchemin/NewNoteModal'

export default function NewNotePage() {
  const router = useRouter()
  return <NewNoteModal isOpen onClose={() => router.back()} />
}
