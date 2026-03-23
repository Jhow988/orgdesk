'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined)
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')

  return (
    <div className="w-full max-w-sm px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">OrgDesk</h1>
        <p className="mt-1 text-sm text-zinc-400">Faça login na sua conta</p>
      </div>

      <form action={action} className="space-y-4">
        {registered && (
          <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2">
            Conta criada com sucesso! Faça login para continuar.
          </p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Não tem conta?{' '}
        <Link href="/register" className="text-zinc-400 hover:text-white transition-colors">
          Cadastre sua empresa
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
