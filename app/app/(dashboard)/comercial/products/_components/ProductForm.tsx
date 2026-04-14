'use client'

import { useActionState, useState } from 'react'

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
    stock_quantity?: number | null
  }
}

export function ProductForm({ action, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const [type, setType] = useState(defaultValues?.type ?? 'SERVICE')

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
          <label className="text-xs font-medium text-zinc-400">Nome *</label>
          <input name="name" required defaultValue={defaultValues?.name}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Tipo *</label>
          <select name="type" value={type} onChange={e => setType(e.target.value)}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none">
            <option value="SERVICE">Serviço</option>
            <option value="PRODUCT">Produto</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Unidade</label>
          <input name="unit" defaultValue={defaultValues?.unit ?? 'un'} placeholder="un, hr, mês..."
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Preço padrão (R$)</label>
          <input name="price" type="number" step="0.01" min="0"
            defaultValue={defaultValues?.price != null ? Number(defaultValues.price).toFixed(2) : '0.00'}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none" />
        </div>

        {type === 'PRODUCT' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Quantidade em estoque</label>
            <input
              name="stock_quantity"
              type="number"
              min="0"
              step="1"
              defaultValue={defaultValues?.stock_quantity ?? ''}
              placeholder="Ex: 100"
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
            />
            <p className="text-[11px] text-zinc-600">Deixe em branco para não controlar estoque</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Status</label>
          <select name="is_active" defaultValue={defaultValues?.is_active === false ? '0' : '1'}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none">
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-zinc-400">Descrição</label>
          <textarea name="description" rows={3} defaultValue={defaultValues?.description ?? ''}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none resize-none" />
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
