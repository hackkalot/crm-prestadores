'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resetPassword, type AuthState } from '@/lib/auth/actions'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const initialState: AuthState = {}

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState)
  const [isProcessingToken, setIsProcessingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Process the recovery token from URL hash when the page loads
  useEffect(() => {
    const processRecoveryToken = async () => {
      const supabase = createClient()

      // Check if there's a hash fragment with tokens
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && type === 'recovery') {
        // Set the session using the recovery tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (error) {
          console.error('Error setting session:', error)
          setTokenError('O link de recuperação é inválido ou expirou. Por favor, solicite um novo.')
        } else {
          // Clear the hash from URL for security
          window.history.replaceState(null, '', window.location.pathname)
        }
      } else {
        // Check if user already has an active session (might have clicked the link already)
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // No token in URL and no session - link might have expired or been used
          setTokenError('Sessão expirada. Por favor, solicite um novo link de recuperação de password.')
        }
      }

      setIsProcessingToken(false)
    }

    processRecoveryToken()
  }, [])

  // Show loading while processing token
  if (isProcessingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <CardTitle className="text-2xl">Nova Password</CardTitle>
            <CardDescription>
              A verificar link de recuperação...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error if token processing failed
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <CardTitle className="text-2xl">Nova Password</CardTitle>
            <CardDescription>
              Erro na recuperação de password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {tokenError}
            </div>
            <Link href="/esqueci-password">
              <Button className="w-full" variant="outline">
                Solicitar novo link
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full" variant="ghost">
                Voltar ao Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">F</span>
          </div>
          <CardTitle className="text-2xl">Nova Password</CardTitle>
          <CardDescription>
            Define a tua nova password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 text-sm text-green-700 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Password atualizada!</p>
                  <p className="text-green-600 mt-1">
                    Já podes fazer login com a tua nova password.
                  </p>
                </div>
              </div>
              <Link href="/login">
                <Button className="w-full">
                  Ir para Login
                </Button>
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {state.error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Nova Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'A atualizar...' : 'Atualizar Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
