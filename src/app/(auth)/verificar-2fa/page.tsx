'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Mail, Smartphone, Key, Loader2, RefreshCw } from 'lucide-react'
import { verifyLoginCode, sendLoginVerificationCode } from '@/lib/auth/two-factor'
import { completeLoginWith2FA } from '@/lib/auth/actions'
import { cn } from '@/lib/utils'

function VerifyTwoFactorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const userId = searchParams.get('uid')
  const method = searchParams.get('method') as 'email' | 'totp' | null
  const returnTo = searchParams.get('returnTo') || '/candidaturas'

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Start cooldown for email resend
  useEffect(() => {
    if (method === 'email') {
      setResendCooldown(60) // 60 second cooldown
    }
  }, [method])

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Redirect if no userId
  useEffect(() => {
    if (!userId || !method) {
      router.replace('/login')
    }
  }, [userId, method, router])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    const numValue = value.replace(/\D/g, '')

    if (numValue.length <= 1) {
      const newCode = [...code]
      newCode[index] = numValue
      setCode(newCode)

      // Auto-focus next input
      if (numValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    } else if (numValue.length === 6) {
      // Handle paste
      setCode(numValue.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length > 0) {
      const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
      setCode(newCode)
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleVerify = async () => {
    if (!userId) return

    const codeToVerify = useBackupCode ? backupCode : code.join('')

    if (!useBackupCode && codeToVerify.length !== 6) {
      setError('Introduza o código de 6 dígitos')
      return
    }

    if (useBackupCode && !backupCode.trim()) {
      setError('Introduza o código de recuperação')
      return
    }

    setIsVerifying(true)
    setError(null)

    const result = await verifyLoginCode(userId, codeToVerify, useBackupCode)

    if (result.success && result.sessionToken) {
      // Call server action to clear 2FA pending cookie and complete login
      // This will redirect to returnTo on success
      const completeResult = await completeLoginWith2FA(result.sessionToken, returnTo)

      // If we get here, there was an error (redirect didn't happen)
      if (completeResult?.error) {
        setError(completeResult.error)
        setIsVerifying(false)
      }
      // Note: On success, the server action will redirect, so we won't reach here
    } else {
      setError(result.error || 'Erro ao verificar código')
      if (!useBackupCode) {
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (!userId || resendCooldown > 0) return

    setIsResending(true)
    setError(null)

    const result = await sendLoginVerificationCode(userId)

    if (result.success) {
      setResendCooldown(60)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } else {
      setError(result.error || 'Erro ao reenviar código')
    }

    setIsResending(false)
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (!useBackupCode && code.every(c => c !== '') && code.join('').length === 6) {
      handleVerify()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, useBackupCode])

  if (!userId || !method) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificação em 2 Passos</CardTitle>
          <CardDescription>
            {useBackupCode ? (
              'Introduza um dos seus códigos de recuperação'
            ) : method === 'email' ? (
              'Enviámos um código de verificação para o seu email'
            ) : (
              'Abra a sua app de autenticação e introduza o código'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {useBackupCode ? (
            // Backup code input
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="w-4 h-4" />
                <span>Código de recuperação</span>
              </div>
              <Input
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className="text-center text-lg tracking-widest font-mono"
                maxLength={10}
                autoFocus
              />
            </div>
          ) : (
            // OTP code input
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {method === 'email' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Código enviado por email</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Código da app de autenticação</span>
                  </>
                )}
              </div>

              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      'w-12 h-14 text-center text-2xl font-mono',
                      'focus:ring-2 focus:ring-primary'
                    )}
                    autoFocus={index === 0}
                    disabled={isVerifying}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={isVerifying || (!useBackupCode && code.join('').length !== 6) || (useBackupCode && !backupCode.trim())}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A verificar...
              </>
            ) : (
              'Verificar'
            )}
          </Button>

          <div className="flex flex-col gap-2">
            {method === 'email' && !useBackupCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0}
                className="text-sm"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A reenviar...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reenviar código ({resendCooldown}s)
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reenviar código
                  </>
                )}
              </Button>
            )}

            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setUseBackupCode(!useBackupCode)
                setError(null)
                setBackupCode('')
                setCode(['', '', '', '', '', ''])
              }}
              className="text-sm text-muted-foreground"
            >
              {useBackupCode ? (
                <>Usar código de verificação</>
              ) : (
                <>Usar código de recuperação</>
              )}
            </Button>

            <Button
              variant="link"
              size="sm"
              onClick={() => router.push('/login')}
              className="text-sm text-muted-foreground"
            >
              Voltar ao login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificação em 2 Passos</CardTitle>
          <CardDescription>A carregar...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyTwoFactorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyTwoFactorContent />
    </Suspense>
  )
}
