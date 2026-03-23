'use client'

import { useActionState, useState, useCallback } from 'react'

type State = { error?: string } | null

interface Product {
  id: string
  name: string
  unit: string | null
  price: any
  type: string
}

interface Client {
  id: string
  name: string
}

interface Item {
  id: string
  product_id: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
}

interface Props {
  action: (prev: State, data: FormData) => Promise<State>
  clients: Client[]
  products: Product[]
  defaultValues?: {
    title?: string
    client_id?: string
    valid_until?: string
    notes?: string
    discount?: number
    items?: Item[]
  }
}

let nextId = 1

export function ProposalForm({ action, clients, products, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const [items, setItems] = useState<Item[]>(defaultValues?.items ?? [])
  const [discount, setDiscount] = useState(defaultValues?.discount ?? 0)

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const total = Math.max(0, subtotal - discount)

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: `new-${nextId++}`,
      product_id: '',
      description: '',
      unit: 'un',
      quantity: 1,
      unit_price: 0,
      total: 0,
    }])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateItem = useCallback((id: string, field: keyof Item, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'product_id') {
        const product = products.find(p => p.id === value)
        if (product) {
          updated.description = product.name
          updated.unit = product.unit ?? 'un'
          updated.unit_price = Number(product.price)
          updated.total = updated.quantity * Number(product.price)
        }
      }
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) : updated.quantity
        const price = field === 'unit_price' ? Number(value) : updated.unit_price
        updated.total = qty * price
      }
      return updated
    }))
  }, [products])

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">{state.error}</div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dados gerais</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-500">Título *</label>
            <input name="title" required defaultValue={defaultValues?.title}
              placeholder="Ex: Proposta de desenvolvimento de sistema"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Cliente *</label>
            <select name="client_id" required defaultValue={defaultValues?.client_id}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Válida até</label>
            <input name="valid_until" type="date" defaultValue={defaultValues?.valid_until}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-500">Observações</label>
            <textarea name="notes" rows={3} defaultValue={defaultValues?.notes}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Itens</p>
          <button type="button" onClick={addItem}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
            + Adicionar item
          </button>
        </div>

        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-400">Nenhum item adicionado. Clique em "+ Adicionar item".</p>
        )}

        {items.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-zinc-300 bg-zinc-100/60 p-4 space-y-3">
            <input type="hidden" name={`items[${idx}][id]`} value={item.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-400">Produto/Serviço (opcional)</label>
                <select value={item.product_id} onChange={e => updateItem(item.id, 'product_id', e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none">
                  <option value="">— Digitar manualmente —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type === 'SERVICE' ? 'Serviço' : 'Produto'})</option>
                  ))}
                </select>
                <input type="hidden" name={`items[${idx}][product_id]`} value={item.product_id} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-400">Descrição *</label>
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  name={`items[${idx}][description]`} required
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Unidade</label>
                <input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                  name={`items[${idx}][unit]`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Quantidade</label>
                <input type="number" step="0.001" min="0.001"
                  value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                  name={`items[${idx}][quantity]`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Preço unitário (R$)</label>
                <input type="number" step="0.01" min="0"
                  value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                  name={`items[${idx}][unit_price]`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Subtotal</label>
                <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-500">
                  {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <input type="hidden" name={`items[${idx}][total]`} value={item.total} />
              </div>
            </div>

            <button type="button" onClick={() => removeItem(item.id)}
              className="text-xs text-red-500 hover:text-red-400 transition-colors">
              Remover item
            </button>
          </div>
        ))}

        <input type="hidden" name="items_count" value={items.length} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex gap-6">
            <span className="text-zinc-400">Subtotal</span>
            <span className="font-mono text-zinc-900 w-32 text-right">
              {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">Desconto (R$)</span>
            <input type="number" step="0.01" min="0" value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              name="discount"
              className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm font-mono text-zinc-900 focus:border-zinc-400 focus:outline-none" />
          </div>
          <div className="flex gap-6 border-t border-zinc-200 pt-2">
            <span className="font-semibold text-zinc-500">Total</span>
            <span className="font-mono font-bold text-zinc-900 w-32 text-right">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <input type="hidden" name="total" value={total} />
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar proposta'}
      </button>
    </form>
  )
}
