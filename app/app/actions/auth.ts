'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export type LoginState = { error?: string } | undefined

export async function loginAction(_prevState: LoginState, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email ou senha incorretos.' }
    }
    throw error // propaga o NEXT_REDIRECT do NextAuth
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
