'use client'

import { useActionState } from 'react'

type State = { error?: string; success?: string } | null

interface Props {
  action: (prev: State, data: FormData) => Promise<State>
  clients: { id: string; name: string }[]
  defaultValues?: { title?: string; client_id?: string; proposal_id?: string; content?: string; expires_at?: string }
}

export function ContractForm({ action, clients, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">{state.error}</div>
      )}

      {defaultValues?.proposal_id && (
        <input type="hidden" name="proposal_id" value={defaultValues.proposal_id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-400">Título *</label>
          <input name="title" required defaultValue={defaultValues?.title}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Cliente *</label>
          <select name="client_id" required defaultValue={defaultValues?.client_id}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none">
            <option value="">Selecione um cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Expira em</label>
          <input name="expires_at" type="date" defaultValue={defaultValues?.expires_at}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-400">Conteúdo do contrato</label>
          <textarea name="content" rows={12} defaultValue={defaultValues?.content}
            placeholder="Digite o texto do contrato aqui..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none resize-y font-mono" />
          <p className="text-xs text-zinc-600">O cliente poderá visualizar e assinar digitalmente pelo portal.</p>
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar contrato'}
      </button>
    </form>
  )
}
