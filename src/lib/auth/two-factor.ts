'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'

// =============================================================================
// CONSTANTS
// =============================================================================

const TOTP_ISSUER = 'FIXO CRM'
const CODE_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 30
const SESSION_EXPIRY_MINUTES = 5 // Short-lived session token for login flow
const BACKUP_CODES_COUNT = 10

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY_2FA || process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) || ''

// =============================================================================
// TYPES
// =============================================================================

export type TwoFactorMethod = 'email' | 'totp'

export interface TwoFactorStatus {
  enabled: boolean
  method: TwoFactorMethod | null
  hasBackupCodes: boolean
}

export interface TwoFactorSetupResult {
  success: boolean
  error?: string
  qrCode?: string // Base64 QR code for TOTP
  secret?: string // TOTP secret (for manual entry)
  backupCodes?: string[] // Only shown once during setup
}

export interface TwoFactorVerifyResult {
  success: boolean
  error?: string
  sessionToken?: string // Temporary token for login completion
}

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not configured')
  const [ivHex, encrypted] = encryptedText.split(':')
  if (!ivHex || !encrypted) throw new Error('Invalid encrypted format')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateBackupCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getClientInfo() {
  const headersList = await headers()
  return {
    ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown',
    userAgent: headersList.get('user-agent') || 'unknown',
  }
}

async function sendEmailCode(email: string, code: string): Promise<boolean> {
  // TODO: Implement email sending via Resend or similar service
  // For now, we'll log it (remove in production!)
  console.log(`[2FA] Email code for ${email}: ${code}`)

  // In production, use your email service:
  // await resend.emails.send({
  //   from: 'noreply@fixo.pt',
  //   to: email,
  //   subject: 'Código de Verificação - FIXO CRM',
  //   html: `<p>O seu código de verificação é: <strong>${code}</strong></p><p>Este código expira em ${CODE_EXPIRY_MINUTES} minutos.</p>`,
  // })

  return true
}

// =============================================================================
// 2FA STATUS
// =============================================================================

/**
 * Get 2FA status for the current user
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatus | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('users')
    .select('two_factor_enabled, two_factor_method, backup_codes_hash')
    .eq('id', user.id)
    .single()

  if (!data) return null

  return {
    enabled: data.two_factor_enabled || false,
    method: data.two_factor_method as TwoFactorMethod | null,
    hasBackupCodes: Array.isArray(data.backup_codes_hash) && data.backup_codes_hash.length > 0,
  }
}

/**
 * Check if a user has 2FA enabled (for login flow)
 */
export async function checkUserHas2FA(userId: string): Promise<{ enabled: boolean; method: TwoFactorMethod | null }> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('users')
    .select('two_factor_enabled, two_factor_method')
    .eq('id', userId)
    .single()

  return {
    enabled: data?.two_factor_enabled || false,
    method: (data?.two_factor_method as TwoFactorMethod) || null,
  }
}

// =============================================================================
// SETUP 2FA
// =============================================================================

/**
 * Initialize 2FA setup for email method
 * Sends a verification code to the user's email
 */
export async function setupTwoFactorEmail(): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const clientInfo = await getClientInfo()

  // Generate code
  const code = generateCode()
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

  // Store hashed code
  await adminClient.from('two_factor_codes').insert({
    user_id: user.id,
    code_hash: hashCode(code),
    code_type: 'setup',
    method: 'email',
    expires_at: expiresAt.toISOString(),
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
  })

  // Send email
  const emailSent = await sendEmailCode(user.email!, code)

  if (!emailSent) {
    return { success: false, error: 'Erro ao enviar email' }
  }

  return { success: true }
}

/**
 * Initialize 2FA setup for TOTP (authenticator app)
 * Returns QR code and secret for the user to scan
 */
export async function setupTwoFactorTOTP(): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  // Generate TOTP secret
  const secret = generateSecret()

  // Create otpauth URL
  const otpauthUrl = generateURI({
    issuer: TOTP_ISSUER,
    label: user.email!,
    secret,
  })

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(otpauthUrl)

  // Store encrypted secret temporarily (will be confirmed after verification)
  const adminClient = createAdminClient()
  await adminClient
    .from('users')
    .update({
      totp_secret_encrypted: encrypt(secret),
      totp_confirmed_at: null, // Not confirmed yet
    })
    .eq('id', user.id)

  return {
    success: true,
    qrCode,
    secret, // For manual entry
  }
}

/**
 * Confirm 2FA setup by verifying the code
 */
export async function confirmTwoFactorSetup(
  method: TwoFactorMethod,
  code: string
): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const adminClient = createAdminClient()

  if (method === 'email') {
    // Verify email code
    const { data: codeRecord } = await adminClient
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_type', 'setup')
      .eq('method', 'email')
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!codeRecord) {
      return { success: false, error: 'Código expirado ou inválido. Solicite um novo código.' }
    }

    // Check attempts
    if ((codeRecord.attempts || 0) >= MAX_ATTEMPTS) {
      return { success: false, error: 'Demasiadas tentativas. Solicite um novo código.' }
    }

    // Verify code hash
    if (hashCode(code) !== codeRecord.code_hash) {
      await adminClient
        .from('two_factor_codes')
        .update({ attempts: (codeRecord.attempts || 0) + 1 })
        .eq('id', codeRecord.id)
      return { success: false, error: 'Código incorreto' }
    }

    // Mark as verified
    await adminClient
      .from('two_factor_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', codeRecord.id)

  } else if (method === 'totp') {
    // Verify TOTP code
    const { data: userData } = await adminClient
      .from('users')
      .select('totp_secret_encrypted')
      .eq('id', user.id)
      .single()

    if (!userData?.totp_secret_encrypted) {
      return { success: false, error: 'TOTP não configurado. Inicie a configuração novamente.' }
    }

    const secret = decrypt(userData.totp_secret_encrypted)
    const result = verifySync({ token: code, secret })
    const isValid = result.valid

    if (!isValid) {
      return { success: false, error: 'Código incorreto' }
    }

    // Mark TOTP as confirmed
    await adminClient
      .from('users')
      .update({ totp_confirmed_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  // Generate backup codes
  const backupCodes: string[] = []
  const hashedBackupCodes: string[] = []

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    const code = generateBackupCode()
    backupCodes.push(code)
    hashedBackupCodes.push(hashCode(code))
  }

  // Enable 2FA
  await adminClient
    .from('users')
    .update({
      two_factor_enabled: true,
      two_factor_method: method,
      backup_codes_hash: hashedBackupCodes,
    })
    .eq('id', user.id)

  return {
    success: true,
    backupCodes, // Show only once!
  }
}

// =============================================================================
// VERIFY 2FA (LOGIN FLOW)
// =============================================================================

/**
 * Send 2FA verification code for login
 */
export async function sendLoginVerificationCode(userId: string): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient()
  const clientInfo = await getClientInfo()

  // Get user's 2FA method and email
  const { data: userData } = await adminClient
    .from('users')
    .select('two_factor_method, email')
    .eq('id', userId)
    .single()

  if (!userData) {
    return { success: false, error: 'Utilizador não encontrado' }
  }

  // Check if locked out
  const { data: lockData } = await adminClient
    .from('users')
    .select('two_factor_locked_until')
    .eq('id', userId)
    .single()

  if (lockData?.two_factor_locked_until && new Date(lockData.two_factor_locked_until) > new Date()) {
    return { success: false, error: 'Conta temporariamente bloqueada. Tente mais tarde.' }
  }

  if (userData.two_factor_method === 'email') {
    // Generate and send email code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    await adminClient.from('two_factor_codes').insert({
      user_id: userId,
      code_hash: hashCode(code),
      code_type: 'login',
      method: 'email',
      expires_at: expiresAt.toISOString(),
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
    })

    // Get user email from Supabase auth
    const supabase = await createClient()
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)

    if (authUser?.user?.email) {
      await sendEmailCode(authUser.user.email, code)
    } else {
      // Fallback to users table email
      await sendEmailCode(userData.email, code)
    }
  }
  // For TOTP, no action needed - user uses their authenticator app

  return { success: true }
}

/**
 * Verify 2FA code during login
 */
export async function verifyLoginCode(
  userId: string,
  code: string,
  isBackupCode: boolean = false
): Promise<TwoFactorVerifyResult> {
  const adminClient = createAdminClient()
  const clientInfo = await getClientInfo()

  // Check if locked out
  const { data: userData } = await adminClient
    .from('users')
    .select('two_factor_method, totp_secret_encrypted, backup_codes_hash, two_factor_attempts, two_factor_locked_until')
    .eq('id', userId)
    .single()

  if (!userData) {
    return { success: false, error: 'Utilizador não encontrado' }
  }

  // Check lockout
  if (userData.two_factor_locked_until && new Date(userData.two_factor_locked_until) > new Date()) {
    const remainingMinutes = Math.ceil((new Date(userData.two_factor_locked_until).getTime() - Date.now()) / 60000)
    return { success: false, error: `Conta bloqueada. Tente novamente em ${remainingMinutes} minutos.` }
  }

  let isValid = false

  if (isBackupCode) {
    // Check backup codes
    const backupCodes = userData.backup_codes_hash as string[] || []
    const codeHash = hashCode(code.toUpperCase())
    const codeIndex = backupCodes.indexOf(codeHash)

    if (codeIndex >= 0) {
      isValid = true
      // Remove used backup code
      backupCodes.splice(codeIndex, 1)
      await adminClient
        .from('users')
        .update({ backup_codes_hash: backupCodes })
        .eq('id', userId)
    }
  } else if (userData.two_factor_method === 'email') {
    // Verify email code
    const { data: codeRecord } = await adminClient
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code_type', 'login')
      .eq('method', 'email')
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeRecord && hashCode(code) === codeRecord.code_hash) {
      isValid = true
      await adminClient
        .from('two_factor_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', codeRecord.id)
    }
  } else if (userData.two_factor_method === 'totp') {
    // Verify TOTP code
    if (userData.totp_secret_encrypted) {
      try {
        const secret = decrypt(userData.totp_secret_encrypted)
        const result = verifySync({ token: code, secret })
        isValid = result.valid
      } catch {
        return { success: false, error: 'Erro ao verificar código' }
      }
    }
  }

  if (!isValid) {
    // Increment attempts
    const newAttempts = (userData.two_factor_attempts || 0) + 1
    const updateData: Record<string, unknown> = { two_factor_attempts: newAttempts }

    if (newAttempts >= MAX_ATTEMPTS) {
      // Lock account
      updateData.two_factor_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      updateData.two_factor_attempts = 0
    }

    await adminClient.from('users').update(updateData).eq('id', userId)

    if (newAttempts >= MAX_ATTEMPTS) {
      return { success: false, error: `Demasiadas tentativas. Conta bloqueada por ${LOCKOUT_MINUTES} minutos.` }
    }

    return { success: false, error: `Código incorreto. ${MAX_ATTEMPTS - newAttempts} tentativas restantes.` }
  }

  // Reset attempts on success
  await adminClient
    .from('users')
    .update({
      two_factor_attempts: 0,
      two_factor_locked_until: null,
      last_two_factor_at: new Date().toISOString(),
    })
    .eq('id', userId)

  // Create short-lived session token for login completion
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000)

  await adminClient.from('two_factor_sessions').insert({
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt.toISOString(),
    ip_address: clientInfo.ip,
    user_agent: clientInfo.userAgent,
  })

  return { success: true, sessionToken }
}

/**
 * Validate 2FA session token and complete login
 */
export async function validateTwoFactorSession(sessionToken: string): Promise<{ valid: boolean; userId?: string }> {
  const adminClient = createAdminClient()

  const { data } = await adminClient
    .from('two_factor_sessions')
    .select('user_id, expires_at')
    .eq('session_token', sessionToken)
    .single()

  if (!data || new Date(data.expires_at) < new Date()) {
    return { valid: false }
  }

  // Delete used session
  await adminClient
    .from('two_factor_sessions')
    .delete()
    .eq('session_token', sessionToken)

  return { valid: true, userId: data.user_id }
}

// =============================================================================
// DISABLE 2FA
// =============================================================================

/**
 * Disable 2FA for the current user
 */
export async function disableTwoFactor(code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const adminClient = createAdminClient()

  // Get user 2FA settings
  const { data: userData } = await adminClient
    .from('users')
    .select('two_factor_method, totp_secret_encrypted, backup_codes_hash')
    .eq('id', user.id)
    .single()

  if (!userData) return { success: false, error: 'Utilizador não encontrado' }

  // Verify code
  let isValid = false

  // Try backup code first
  const backupCodes = userData.backup_codes_hash as string[] || []
  if (backupCodes.includes(hashCode(code.toUpperCase()))) {
    isValid = true
  } else if (userData.two_factor_method === 'totp' && userData.totp_secret_encrypted) {
    try {
      const secret = decrypt(userData.totp_secret_encrypted)
      const result = verifySync({ token: code, secret })
      isValid = result.valid
    } catch {
      return { success: false, error: 'Erro ao verificar código' }
    }
  }

  if (!isValid) {
    return { success: false, error: 'Código incorreto' }
  }

  // Disable 2FA
  await adminClient
    .from('users')
    .update({
      two_factor_enabled: false,
      two_factor_method: null,
      totp_secret_encrypted: null,
      totp_confirmed_at: null,
      backup_codes_hash: null,
    })
    .eq('id', user.id)

  return { success: true }
}

// =============================================================================
// REGENERATE BACKUP CODES
// =============================================================================

/**
 * Regenerate backup codes for the current user
 */
export async function regenerateBackupCodes(code: string): Promise<TwoFactorSetupResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const adminClient = createAdminClient()

  // Get user 2FA settings
  const { data: userData } = await adminClient
    .from('users')
    .select('two_factor_method, totp_secret_encrypted, two_factor_enabled')
    .eq('id', user.id)
    .single()

  if (!userData?.two_factor_enabled) {
    return { success: false, error: '2FA não está ativado' }
  }

  // Verify current code (TOTP only)
  if (userData.two_factor_method === 'totp' && userData.totp_secret_encrypted) {
    try {
      const secret = decrypt(userData.totp_secret_encrypted)
      const result = verifySync({ token: code, secret })
      if (!result.valid) {
        return { success: false, error: 'Código incorreto' }
      }
    } catch {
      return { success: false, error: 'Erro ao verificar código' }
    }
  }

  // Generate new backup codes
  const backupCodes: string[] = []
  const hashedBackupCodes: string[] = []

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    const code = generateBackupCode()
    backupCodes.push(code)
    hashedBackupCodes.push(hashCode(code))
  }

  await adminClient
    .from('users')
    .update({ backup_codes_hash: hashedBackupCodes })
    .eq('id', user.id)

  return { success: true, backupCodes }
}
