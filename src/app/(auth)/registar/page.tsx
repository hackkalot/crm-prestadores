'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { register, type AuthState } from '@/lib/auth/actions'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const initialState: AuthState = {}

export default function RegistarPage() {
  const [state, formAction, isPending] = useActionState(register, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">F</span>
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Regista-te para aceder ao CRM de Prestadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 text-sm text-green-700 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">Conta criada com sucesso!</p>
                  <p className="text-green-600">Verifica o teu email para confirmar a conta.</p>
                </div>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Voltar ao Login
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
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="O teu nome"
                  required
                  disabled={isPending}
                />
              </div>

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
                <label htmlFor="password" className="text-sm font-medium">
                  Password
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
                  Minimo 6 caracteres
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'A criar conta...' : 'Criar Conta'}
              </Button>
            </form>
          )}

          {!state.success && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Ja tens conta?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
