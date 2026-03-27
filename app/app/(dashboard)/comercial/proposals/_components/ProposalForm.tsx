'use client'

import { useActionState, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'

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

type ItemType = 'MONTHLY_SERVICE' | 'ONETIME_SERVICE' | 'EQUIPMENT_RENTAL' | 'EQUIPMENT_PURCHASE'

const PAYMENT_METHODS = ['Boleto', 'PIX', 'Cartão de Crédito', 'Transferência', 'Outro']

interface Item {
  id: string
  product_id: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  total: number
  item_type: ItemType
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
    freight?: number
    payment_method?: string
    items?: Item[]
  }
}

let nextId = 1

const inp = 'w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none'
const lbl = 'block mb-1 text-xs font-medium text-zinc-400'

export function ProposalForm({ action, clients, products, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const [items, setItems] = useState<Item[]>(defaultValues?.items ?? [])
  const [discount, setDiscount] = useState(defaultValues?.discount ?? 0)
  const [freight,  setFreight]  = useState(defaultValues?.freight  ?? 0)

  const monthly  = items.filter(i => i.item_type === 'MONTHLY_SERVICE').reduce((s, i) => s + i.total, 0)
  const onetime  = items.filter(i => i.item_type !== 'MONTHLY_SERVICE').reduce((s, i) => s + i.total, 0)
  const subtotal = monthly + onetime
  const total    = Math.max(0, subtotal + Number(freight) - discount)

  const addItem = useCallback((type: ItemType) => {
    setItems(prev => [...prev, {
      id: `new-${nextId++}`,
      product_id: '',
      description: '',
      unit: 'un',
      quantity: 1,
      unit_price: 0,
      total: 0,
      item_type: type,
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
          updated.unit        = product.unit ?? 'un'
          updated.unit_price  = Number(product.price)
          updated.total       = updated.quantity * Number(product.price)
        }
      }
      if (field === 'quantity' || field === 'unit_price') {
        const qty   = field === 'quantity'   ? Number(value) : updated.quantity
        const price = field === 'unit_price' ? Number(value) : updated.unit_price
        updated.total = qty * price
      }
      return updated
    }))
  }, [products])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const ITEM_GROUPS: { type: ItemType; label: string; color: string }[] = [
    { type: 'MONTHLY_SERVICE',    label: 'Serviços Mensais',       color: 'text-indigo-400 border-indigo-500/20' },
    { type: 'ONETIME_SERVICE',    label: 'Serviços Avulsos',        color: 'text-sky-400 border-sky-500/20' },
    { type: 'EQUIPMENT_RENTAL',   label: 'Equipamentos Alugados',   color: 'text-amber-400 border-amber-500/20' },
    { type: 'EQUIPMENT_PURCHASE', label: 'Equipamentos Comprados',  color: 'text-emerald-400 border-emerald-500/20' },
  ]

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">{state.error}</div>
      )}

      {/* Dados gerais */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dados Gerais</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Título *</label>
            <input name="title" required defaultValue={defaultValues?.title}
              placeholder="Ex: Proposta de suporte técnico mensal"
              className={inp} />
          </div>
          <div>
            <label className={lbl}>Cliente *</label>
            <select name="client_id" required defaultValue={defaultValues?.client_id} className={inp}>
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Válida até</label>
            <input name="valid_until" type="date" defaultValue={defaultValues?.valid_until} className={inp} />
          </div>
          <div>
            <label className={lbl}>Forma de Pagamento</label>
            <select name="payment_method" defaultValue={defaultValues?.payment_method ?? ''} className={inp}>
              <option value="">— selecione —</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Frete (R$)</label>
            <input type="number" step="0.01" min="0" name="freight"
              value={freight} onChange={e => setFreight(Number(e.target.value))}
              className={inp} />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Observações</label>
            <textarea name="notes" rows={3} defaultValue={defaultValues?.notes}
              className={inp + ' resize-none'} />
          </div>
        </div>
      </div>

      {/* Item groups */}
      {ITEM_GROUPS.map(group => {
        const groupItems = items.filter(i => i.item_type === group.type)
        return (
          <div key={group.type} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wider ${group.color.split(' ')[0]}`}>
                {group.label}
              </p>
              <button type="button" onClick={() => addItem(group.type)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors">
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {groupItems.length === 0 && (
              <p className="py-3 text-center text-xs text-zinc-600">Nenhum item. Clique em "+ Adicionar".</p>
            )}

            {groupItems.map((item) => {
              const globalIdx = items.indexOf(item)
              return (
                <div key={item.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                  <input type="hidden" name={`items[${globalIdx}][item_type]`} value={item.item_type} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={lbl}>Produto/Serviço do catálogo (opcional)</label>
                      <select value={item.product_id} onChange={e => updateItem(item.id, 'product_id', e.target.value)} className={inp}>
                        <option value="">— Digitar manualmente —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.type === 'SERVICE' ? 'Serviço' : 'Produto'})</option>
                        ))}
                      </select>
                      <input type="hidden" name={`items[${globalIdx}][product_id]`} value={item.product_id} />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={lbl}>Descrição *</label>
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                        name={`items[${globalIdx}][description]`} required className={inp} />
                    </div>

                    <div>
                      <label className={lbl}>Unidade</label>
                      <input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        name={`items[${globalIdx}][unit]`} className={inp} />
                    </div>

                    <div>
                      <label className={lbl}>Quantidade</label>
                      <input type="number" step="0.001" min="0.001"
                        value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                        name={`items[${globalIdx}][quantity]`} className={inp} />
                    </div>

                    <div>
                      <label className={lbl}>Preço unitário (R$)</label>
                      <input type="number" step="0.01" min="0"
                        value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                        name={`items[${globalIdx}][unit_price]`} className={inp} />
                    </div>

                    <div>
                      <label className={lbl}>Subtotal</label>
                      <div className="rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm font-mono text-zinc-400">
                        {fmt(item.total)}
                      </div>
                      <input type="hidden" name={`items[${globalIdx}][total]`} value={item.total} />
                    </div>
                  </div>

                  <button type="button" onClick={() => removeItem(item.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors">
                    <Trash2 size={11} /> Remover
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      <input type="hidden" name="items_count" value={items.length} />

      {/* Totais */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Resumo Financeiro</p>
        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex gap-6 w-full max-w-xs justify-between">
            <span className="text-indigo-400">Total Mensal (serviços)</span>
            <span className="font-mono text-indigo-300">{fmt(monthly)}</span>
          </div>
          <div className="flex gap-6 w-full max-w-xs justify-between">
            <span className="text-sky-400">Total Avulso + Equipamentos</span>
            <span className="font-mono text-sky-300">{fmt(onetime)}</span>
          </div>
          {Number(freight) > 0 && (
            <div className="flex gap-6 w-full max-w-xs justify-between">
              <span className="text-zinc-400">Frete</span>
              <span className="font-mono text-zinc-300">{fmt(Number(freight))}</span>
            </div>
          )}
          <div className="flex items-center gap-4 w-full max-w-xs justify-between">
            <span className="text-zinc-400">Desconto (R$)</span>
            <input type="number" step="0.01" min="0" value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              name="discount"
              className="w-32 rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-right text-sm font-mono text-zinc-100 focus:border-white/20 focus:outline-none" />
          </div>
          <div className="flex gap-6 w-full max-w-xs justify-between border-t border-white/[0.08] pt-2">
            <span className="font-semibold text-zinc-300">Total Geral</span>
            <span className="font-mono font-bold text-zinc-100">{fmt(total)}</span>
          </div>
          <input type="hidden" name="total"         value={total} />
          <input type="hidden" name="total_monthly" value={monthly} />
          <input type="hidden" name="total_onetime" value={onetime} />
        </div>
      </div>

      <button type="submit" disabled={isPending}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
        {isPending ? 'Salvando...' : 'Salvar proposta'}
      </button>
    </form>
  )
}
