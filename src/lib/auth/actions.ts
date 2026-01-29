'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkUserHas2FA, sendLoginVerificationCode, validateTwoFactorSession } from './two-factor'

// Cookie name for 2FA pending state
const PENDING_2FA_COOKIE = '2fa_pending'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
})

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
})

export type AuthState = {
  error?: string
  success?: boolean
  requires2FA?: boolean
  userId?: string
  twoFactorMethod?: 'email' | 'totp'
}

export type UserRole = 'admin' | 'user'
export type UserApprovalStatus = 'pending' | 'approved' | 'rejected'

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    const issues = result.error.issues
    return { error: issues[0]?.message || 'Dados invalidos' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { error: 'Email ou password incorretos' }
    }
    return { error: error.message }
  }

  // Verificar status de aprovação
  if (authData.user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('approval_status')
      .eq('id', authData.user.id)
      .single()

    const typedProfile = userProfile as { approval_status: UserApprovalStatus } | null

    if (typedProfile?.approval_status === 'pending') {
      await supabase.auth.signOut()
      return { error: 'A tua conta está pendente de aprovação. Por favor aguarda.' }
    }

    if (typedProfile?.approval_status === 'rejected') {
      await supabase.auth.signOut()
      return { error: 'O teu registo foi rejeitado. Contacta o administrador.' }
    }

    // Check if user has 2FA enabled
    const twoFactor = await checkUserHas2FA(authData.user.id)

    if (twoFactor.enabled && twoFactor.method) {
      // Set 2FA pending cookie instead of signing out
      // This keeps the session alive but marks it as pending 2FA verification
      // Store both userId and method in the cookie value
      const cookieStore = await cookies()
      cookieStore.set(PENDING_2FA_COOKIE, `${authData.user.id}:${twoFactor.method}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes to complete 2FA
        path: '/',
      })

      // Send verification code for email method
      if (twoFactor.method === 'email') {
        await sendLoginVerificationCode(authData.user.id)
      }

      // Return 2FA required state - client will redirect to verification page
      return {
        requires2FA: true,
        userId: authData.user.id,
        twoFactorMethod: twoFactor.method,
      }
    }
  }

  redirect('/candidaturas')
}

/**
 * Complete login after 2FA verification
 * Called with the session token from 2FA verification
 */
export async function completeLoginWith2FA(
  sessionToken: string,
  returnTo: string = '/candidaturas'
): Promise<AuthState> {
  // Validate the 2FA session token
  const { valid, userId } = await validateTwoFactorSession(sessionToken)

  if (!valid || !userId) {
    return { error: 'Sessão de verificação expirada. Faça login novamente.' }
  }

  // Clear the 2FA pending cookie - session is now fully verified
  const cookieStore = await cookies()
  cookieStore.delete(PENDING_2FA_COOKIE)

  // Session is already active (we didn't sign out during 2FA check)
  // Just redirect to the target page
  redirect(returnTo)
}

export async function register(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  const result = registerSchema.safeParse(rawData)
  if (!result.success) {
    const issues = result.error.issues
    return { error: issues[0]?.message || 'Dados invalidos' }
  }

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        name: result.data.name,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este email ja esta registado' }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: 'Email inválido' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    console.error('Reset password error:', error)
    return { error: 'Erro ao enviar email. Tenta novamente.' }
  }

  return { success: true }
}

export async function resetPassword(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { error: 'Password deve ter pelo menos 6 caracteres' }
  }

  if (password !== confirmPassword) {
    return { error: 'As passwords não coincidem' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Update password error:', error)
    return { error: 'Erro ao atualizar password. O link pode ter expirado.' }
  }

  return { success: true }
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
