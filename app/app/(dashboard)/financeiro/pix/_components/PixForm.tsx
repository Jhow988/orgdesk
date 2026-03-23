'use client'

import { useActionState } from 'react'

type State = { error?: string } | null

interface Props {
  action: (prev: State, data: FormData) => Promise<State>
  clients: { id: string; name: string }[]
}

export function PixForm({ action, clients }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">{state.error}</div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Cliente *</label>
        <select name="client_id" required
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none">
          <option value="">Selecione um cliente</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Descrição *</label>
        <input name="description" required placeholder="Ex: Mensalidade março/2026"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Valor (R$) *</label>
        <input name="amount" type="number" step="0.01" min="0.01" required
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Chave PIX</label>
        <input name="pix_key" placeholder="CPF, CNPJ, email ou chave aleatória"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Expira em</label>
        <input name="expires_at" type="date"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea name="notes" rows={2}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none resize-none" />
      </div>

      <button type="submit" disabled={isPending}
        className="w-full rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {isPending ? 'Criando...' : 'Criar cobrança'}
      </button>
    </form>
  )
}
