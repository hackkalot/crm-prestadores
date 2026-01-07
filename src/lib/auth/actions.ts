'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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
  }

  redirect('/candidaturas')
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
