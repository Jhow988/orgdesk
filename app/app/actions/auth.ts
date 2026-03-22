'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export type LoginState = { error?: string } | undefined

export async function loginAction(prevState: LoginState, formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email ou senha incorretos.' }
    }
    return { error: 'Ocorreu um erro inesperado. Tente novamente.' }
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
