'use client'

import { useActionState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { login, type AuthState } from '@/lib/auth/actions'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const initialState: AuthState = {}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, formAction, isPending] = useActionState(login, initialState)

  // Handle 2FA redirect
  useEffect(() => {
    if (state.requires2FA && state.userId && state.twoFactorMethod) {
      const returnTo = searchParams.get('returnTo') || '/candidaturas'
      router.push(
        `/verificar-2fa?uid=${state.userId}&method=${state.twoFactorMethod}&returnTo=${encodeURIComponent(returnTo)}`
      )
    }
  }, [state.requires2FA, state.userId, state.twoFactorMethod, router, searchParams])

  // Note: 2FA completion is now handled by the server action completeLoginWith2FA
  // which redirects directly. No need to handle it here anymore.

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="email@exemplo.com"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link
            href="/esqueci-password"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Esqueci a password
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          disabled={isPending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'A entrar...' : 'Entrar'}
      </Button>
    </form>
  )
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input disabled placeholder="email@exemplo.com" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input disabled type="password" placeholder="••••••••" />
      </div>
      <Button className="w-full" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        A carregar...
      </Button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">F</span>
          </div>
          <CardTitle className="text-2xl">FIXO CRM</CardTitle>
          <CardDescription>
            Faca login para aceder ao CRM de Prestadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Nao tens conta?{' '}
            <Link href="/registar" className="text-primary hover:underline">
              Registar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
