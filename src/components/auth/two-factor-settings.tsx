'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Shield,
  Mail,
  Smartphone,
  Key,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react'
import {
  getTwoFactorStatus,
  setupTwoFactorEmail,
  setupTwoFactorTOTP,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateBackupCodes,
  type TwoFactorStatus,
  type TwoFactorMethod,
} from '@/lib/auth/two-factor'
import { cn } from '@/lib/utils'

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false)

  // Setup state
  const [setupMethod, setSetupMethod] = useState<TwoFactorMethod | null>(null)
  const [setupStep, setSetupStep] = useState<'choose' | 'verify' | 'backup'>('choose')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Disable state
  const [disableCode, setDisableCode] = useState('')

  // Load 2FA status
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    const result = await getTwoFactorStatus()
    setStatus(result)
    setLoading(false)
  }

  const handleStartSetup = (method: TwoFactorMethod) => {
    setSetupMethod(method)
    setSetupStep('verify')
    setError(null)
    setVerificationCode('')
    startSetup(method)
  }

  const startSetup = async (method: TwoFactorMethod) => {
    setIsSubmitting(true)
    setError(null)

    if (method === 'email') {
      const result = await setupTwoFactorEmail()
      if (!result.success) {
        setError(result.error || 'Erro ao iniciar configuração')
      }
    } else {
      const result = await setupTwoFactorTOTP()
      if (result.success) {
        setQrCode(result.qrCode || null)
        setTotpSecret(result.secret || null)
      } else {
        setError(result.error || 'Erro ao iniciar configuração')
      }
    }

    setIsSubmitting(false)
  }

  const handleVerifySetup = async () => {
    if (!setupMethod || !verificationCode) return

    setIsSubmitting(true)
    setError(null)

    const result = await confirmTwoFactorSetup(setupMethod, verificationCode)

    if (result.success) {
      setBackupCodes(result.backupCodes || [])
      setSetupStep('backup')
    } else {
      setError(result.error || 'Erro ao verificar código')
    }

    setIsSubmitting(false)
  }

  const handleFinishSetup = () => {
    setSetupDialogOpen(false)
    setSetupStep('choose')
    setSetupMethod(null)
    setQrCode(null)
    setTotpSecret(null)
    setVerificationCode('')
    setBackupCodes([])
    loadStatus()
  }

  const handleDisable = async () => {
    if (!disableCode) return

    setIsSubmitting(true)
    setError(null)

    const result = await disableTwoFactor(disableCode)

    if (result.success) {
      setDisableDialogOpen(false)
      setDisableCode('')
      loadStatus()
    } else {
      setError(result.error || 'Erro ao desativar 2FA')
    }

    setIsSubmitting(false)
  }

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode) return

    setIsSubmitting(true)
    setError(null)

    const result = await regenerateBackupCodes(verificationCode)

    if (result.success) {
      setBackupCodes(result.backupCodes || [])
      setVerificationCode('')
    } else {
      setError(result.error || 'Erro ao gerar novos códigos')
    }

    setIsSubmitting(false)
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                status?.enabled ? 'bg-green-100' : 'bg-muted'
              )}>
                <Shield className={cn(
                  'w-5 h-5',
                  status?.enabled ? 'text-green-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <CardTitle className="text-lg">Autenticação em 2 Passos</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
            <Badge variant={status?.enabled ? 'success' : 'secondary'}>
              {status?.enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                {status.method === 'email' ? (
                  <>
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>Código por email</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span>App de autenticação (TOTP)</span>
                  </>
                )}
                <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBackupCodesDialogOpen(true)
                    setVerificationCode('')
                    setBackupCodes([])
                    setError(null)
                  }}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Códigos de Recuperação
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDisableDialogOpen(true)
                    setDisableCode('')
                    setError(null)
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  Desativar 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Proteja a sua conta exigindo um código adicional além da password para fazer login.
              </p>
              <Button onClick={() => setSetupDialogOpen(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Configurar 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={(open) => {
        if (!open && setupStep !== 'backup') {
          setSetupDialogOpen(false)
          setSetupStep('choose')
          setSetupMethod(null)
          setQrCode(null)
          setTotpSecret(null)
          setVerificationCode('')
          setError(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {setupStep === 'choose' && 'Escolher Método de Verificação'}
              {setupStep === 'verify' && 'Verificar Configuração'}
              {setupStep === 'backup' && 'Códigos de Recuperação'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'choose' && 'Escolha como pretende receber os códigos de verificação'}
              {setupStep === 'verify' && 'Introduza o código para confirmar a configuração'}
              {setupStep === 'backup' && 'Guarde estes códigos num local seguro'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {setupStep === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => handleStartSetup('email')}
                disabled={isSubmitting}
                className="w-full p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left flex items-start gap-3"
              >
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Código por Email</p>
                  <p className="text-sm text-muted-foreground">
                    Receba um código de 6 dígitos no seu email a cada login
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleStartSetup('totp')}
                disabled={isSubmitting}
                className="w-full p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left flex items-start gap-3"
              >
                <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">App de Autenticação</p>
                  <p className="text-sm text-muted-foreground">
                    Use Microsoft Authenticator, Google Authenticator ou similar
                  </p>
                </div>
              </button>
            </div>
          )}

          {setupStep === 'verify' && (
            <div className="space-y-4">
              {setupMethod === 'totp' && qrCode && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    1. Abra a sua app de autenticação
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Digitalize o código QR abaixo
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                  {totpSecret && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Ou introduza manualmente:
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {totpSecret}
                      </code>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    3. Introduza o código de 6 dígitos gerado
                  </p>
                </div>
              )}

              {setupMethod === 'email' && (
                <p className="text-sm text-muted-foreground">
                  Enviámos um código de verificação para o seu email. Introduza-o abaixo.
                </p>
              )}

              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />

              <Button
                onClick={handleVerifySetup}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A verificar...
                  </>
                ) : (
                  'Verificar e Ativar'
                )}
              </Button>
            </div>
          )}

          {setupStep === 'backup' && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Guarde estes códigos num local seguro. Cada código só pode ser usado uma vez.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={copyBackupCodes}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Códigos
                  </>
                )}
              </Button>

              <Button onClick={handleFinishSetup} className="w-full">
                Concluir Configuração
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desativar Autenticação em 2 Passos</DialogTitle>
            <DialogDescription>
              Introduza um código de verificação ou código de recuperação para desativar o 2FA.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            type="text"
            placeholder="Código de verificação ou recuperação"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            className="text-center font-mono"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDisableDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isSubmitting || !disableCode}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A desativar...
                </>
              ) : (
                'Desativar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={backupCodesDialogOpen} onOpenChange={setBackupCodesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Códigos de Recuperação</DialogTitle>
            <DialogDescription>
              {backupCodes.length > 0
                ? 'Guarde estes novos códigos num local seguro.'
                : 'Introduza um código TOTP para gerar novos códigos de recuperação.'}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {backupCodes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={copyBackupCodes}
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Códigos
                  </>
                )}
              </Button>

              <Button onClick={() => setBackupCodesDialogOpen(false)} className="w-full">
                Fechar
              </Button>
            </>
          ) : (
            <>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />

              <Button
                onClick={handleRegenerateBackupCodes}
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  'Gerar Novos Códigos'
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
