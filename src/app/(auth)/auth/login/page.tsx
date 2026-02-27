'use client'

import { useState, type ReactElement, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage(): ReactElement {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
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
      {/* Logo */}
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
        <p
          className="text-sm"
          style={{ color: 'var(--muted)' }}
        >
          Connectez-vous à votre espace
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@famille.fr"
          required
          autoComplete="email"
        />

        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && (
          <p
            className="text-sm"
            style={{ color: 'var(--danger)' }}
          >
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
    </div>
  )
}