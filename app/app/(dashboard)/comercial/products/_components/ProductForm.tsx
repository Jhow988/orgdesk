'use client'

import { useActionState } from 'react'

type State = { error?: string; success?: string } | null

interface Props {
  action: (prevState: State, formData: FormData) => Promise<State>
  defaultValues?: {
    name?: string
    description?: string | null
    type?: string
    unit?: string | null
    price?: any
    is_active?: boolean
  }
}

export function ProductForm({ action, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">{state.success}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-500">Nome *</label>
          <input name="name" required defaultValue={defaultValues?.name}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Tipo *</label>
          <select name="type" defaultValue={defaultValues?.type ?? 'SERVICE'}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
            <option value="SERVICE">Serviço</option>
            <option value="PRODUCT">Produto</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Unidade</label>
          <input name="unit" defaultValue={defaultValues?.unit ?? 'un'} placeholder="un, hr, mês..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Preço padrão (R$)</label>
          <input name="price" type="number" step="0.01" min="0"
            defaultValue={defaultValues?.price != null ? Number(defaultValues.price).toFixed(2) : '0.00'}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Status</label>
          <select name="is_active" defaultValue={defaultValues?.is_active === false ? '0' : '1'}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-500">Descrição</label>
          <textarea name="description" rows={3} defaultValue={defaultValues?.description ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
