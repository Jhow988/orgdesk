'use client'

import { useActionState } from 'react'
import { registerAction } from '@/app/actions/register'
import type { RegisterState } from '@/app/actions/register'
import Link from 'next/link'

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  error,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-white bg-zinc-900 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors ${error ? 'border-red-700' : 'border-zinc-700'}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(registerAction, undefined)

  return (
    <div className="w-full max-w-md space-y-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">OrgDesk</h1>
        <p className="mt-1 text-sm text-zinc-500">Crie a conta da sua empresa</p>
      </div>

      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {state.error}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Dados da empresa</p>
          <Field
            label="Nome da empresa *"
            name="org_name"
            placeholder="Acme Ltda"
            error={state?.fieldErrors?.org_name}
          />
          <Field
            label="CNPJ"
            name="cnpj"
            placeholder="00.000.000/0000-00"
            error={state?.fieldErrors?.cnpj}
          />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Seu acesso</p>
          <Field
            label="Nome completo *"
            name="admin_name"
            placeholder="João Silva"
            error={state?.fieldErrors?.admin_name}
          />
          <Field
            label="Email *"
            name="email"
            type="email"
            placeholder="joao@empresa.com.br"
            error={state?.fieldErrors?.email}
          />
          <Field
            label="Senha *"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            error={state?.fieldErrors?.password}
          />
          <Field
            label="Confirmar senha *"
            name="password_confirm"
            type="password"
            placeholder="Repita a senha"
            error={state?.fieldErrors?.password_confirm}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600">
        Já tem conta?{' '}
        <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">
          Fazer login
        </Link>
      </p>
    </div>
  )
}
