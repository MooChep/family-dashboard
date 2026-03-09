'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { registerUser } from './action'
import Link from 'next/link'

export default function RegisterPage(): ReactElement {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await registerUser(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      router.push('/auth/login?registered=true')
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Rejoindre la Tribu</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Créez votre accès familial</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Champ de sécurité */}
        <Input 
          label="Clé d'invitation" 
          name="invitationKey" 
          type="password" 
          placeholder="Code secret fourni par l'admin" 
          required 
        />
        
        <hr style={{ borderColor: 'var(--border)', margin: '10px 0' }} />

        <Input label="Votre Prénom" name="name" placeholder="Prénom" required />
        <Input label="Email" name="email" type="email" placeholder="email@famille.fr" required />
        <Input label="Mot de passe" name="password" type="password" placeholder="••••••••" required />

        {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

        <Button type="submit" variant="primary" isLoading={isLoading} className="w-full mt-2">
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
        Déjà membre ? <Link href="/auth/login" className="font-medium" style={{ color: 'var(--accent)' }}>Se connecter</Link>
      </p>
    </div>
  )
}