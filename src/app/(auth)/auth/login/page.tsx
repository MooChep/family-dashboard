'use client'

import { useState, useEffect, type ReactElement, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function LoginPage(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Vérifier si on vient de créer un compte
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Compte créé avec succès ! Connectez-vous maintenant.')
    }
  }, [searchParams])

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou mot de passe incorrect')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Une erreur est survenue, réessayez')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col gap-1">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold mb-2"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          F
        </div>
        <h1
          className="text-xl font-semibold"
          style={{
            color: 'var(--text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Family Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Connectez-vous à votre espace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {success && (
          <p className="text-sm p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-500">
            {success}
          </p>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@famille.fr"
          required
        />

        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full mt-2"
        >
          Se connecter
        </Button>
      </form>

      {/* Lien vers Register */}
      <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
        Nouveau sur la plateforme ?{' '}
        <Link 
          href="/auth/register" 
          className="font-medium" 
          style={{ color: 'var(--accent)' }}
        >
          Créer un compte
        </Link>
      </p>
    </div>
  )
}