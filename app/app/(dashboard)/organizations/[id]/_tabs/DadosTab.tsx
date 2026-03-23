'use client'

import { useActionState } from 'react'
import type { Organization } from '@prisma/client'

type State = { error?: string; success?: string } | null

interface Props {
  org: Organization
  action: (prevState: State, formData: FormData) => Promise<State>
}

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function DadosTab({ org, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">
          {state.success}
        </div>
      )}

      <div>
        <h3 className="mb-4 text-sm font-semibold text-zinc-500">Informações da empresa</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nome *</label>
            <input name="name" required defaultValue={org.name}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Slug</label>
            <input defaultValue={org.slug} readOnly
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-500 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">CNPJ</label>
            <input name="cnpj" defaultValue={org.cnpj ?? ''}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Email de cobrança</label>
            <input name="billing_email" type="email" defaultValue={org.billing_email ?? ''}
              placeholder="financeiro@empresa.com.br"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Plano</label>
            <select name="plan" defaultValue={org.plan}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
              {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Status</label>
            <select name="is_active" defaultValue={org.is_active ? '1' : '0'}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-zinc-500">Observações internas</h3>
        <textarea name="notes" defaultValue={org.notes ?? ''} rows={4}
          placeholder="Anotações visíveis apenas para o administrador do sistema..."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none resize-none" />
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
