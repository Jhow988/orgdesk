'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCarteiraAction, updateCarteiraAction, deleteCarteiraAction } from '@/app/actions/carteira'
import { Wallet, Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react'

interface Empresa {
  id: string
  name: string
  cnpj: string
}

interface Carteira {
  id: string
  name: string
  description: string | null
  type: string
  bank: string | null
  is_active: boolean
  empresa_id: string
  empresa: {
    id: string
    name: string
    cnpj: string
  }
}

interface CarteirasManagerProps {
  carteiras: Carteira[]
  empresas: Empresa[]
}

interface CarteiraFormData {
  name: string
  empresa_id: string
  description: string
  type: string
  bank: string
  is_active: boolean
}

const EMPTY_FORM: CarteiraFormData = {
  name: '',
  empresa_id: '',
  description: '',
  type: 'CORRENTE',
  bank: '',
  is_active: true,
}

const TYPE_OPTIONS = [
  { value: 'CORRENTE', label: 'Corrente' },
  { value: 'POUPANÇA', label: 'Poupança' },
  { value: 'CAIXA', label: 'Caixa' },
  { value: 'DIGITAL', label: 'Digital' },
]

const TYPE_BADGE: Record<string, string> = {
  CORRENTE: 'bg-blue-900/40 text-blue-300 border-blue-800',
  POUPANÇA: 'bg-green-900/40 text-green-300 border-green-800',
  CAIXA: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  DIGITAL: 'bg-purple-900/40 text-purple-300 border-purple-800',
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function CarteirasManager({ carteiras: initial, empresas }: CarteirasManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Carteira | null>(null)
  const [form, setForm] = useState<CarteiraFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setForm({ ...EMPTY_FORM, empresa_id: empresas[0]?.id ?? '' })
    setEditing(null)
    setError(null)
    setShowCreate(true)
  }

  function openEdit(c: Carteira) {
    setForm({
      name: c.name,
      empresa_id: c.empresa_id,
      description: c.description ?? '',
      type: c.type,
      bank: c.bank ?? '',
      is_active: c.is_active,
    })
    setEditing(c)
    setShowCreate(false)
    setError(null)
  }

  function closeForm() {
    setShowCreate(false)
    setEditing(null)
    setError(null)
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createCarteiraAction(null, formData)
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateCarteiraAction(editing.id, {
        name: form.name,
        empresa_id: form.empresa_id,
        description: form.description || null,
        type: form.type,
        bank: form.bank || null,
        is_active: form.is_active,
      })
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a carteira "${name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await deleteCarteiraAction(id)
      router.refresh()
    })
  }

  // Group carteiras by empresa name
  const grouped = initial.reduce<Record<string, Carteira[]>>((acc, c) => {
    const key = c.empresa.name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const isFormOpen = showCreate || editing !== null

  const inputCls = 'w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none'
  const labelCls = 'mb-1 block text-xs text-zinc-400'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{initial.length} carteira(s) cadastrada(s)</p>
        <button
          onClick={openCreate}
          disabled={isPending || empresas.length === 0}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Plus size={14} />
          Nova Carteira
        </button>
      </div>

      {empresas.length === 0 && (
        <p className="rounded-md border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-400">
          Cadastre ao menos uma empresa antes de criar carteiras.
        </p>
      )}

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              {editing ? 'Editar Carteira' : 'Nova Carteira'}
            </h3>
            <button onClick={closeForm} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>

          {error && (
            <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <form
            action={showCreate ? handleCreate : undefined}
            onSubmit={editing ? (e) => { e.preventDefault(); handleUpdate() } : undefined}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome da carteira *</label>
              <input
                name="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ex: Conta Principal"
              />
            </div>

            <div>
              <label className={labelCls}>Empresa *</label>
              <select
                name="empresa_id"
                value={form.empresa_id}
                onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value }))}
                required
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Tipo</label>
              <select
                name="type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inputCls}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Banco</label>
              <input
                name="bank"
                value={form.bank}
                onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                className={inputCls}
                placeholder="Ex: Itaú, Nubank..."
              />
            </div>

            <div>
              <label className={labelCls}>Descrição</label>
              <input
                name="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inputCls}
                placeholder="Opcional"
              />
            </div>

            {editing && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm text-zinc-300">Carteira ativa</label>
              </div>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Check size={14} />
                {editing ? 'Salvar' : 'Criar Carteira'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {initial.length === 0 && !isFormOpen ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <Wallet size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Nenhuma carteira cadastrada.</p>
          <p className="mt-1 text-xs text-zinc-600">Clique em "Nova Carteira" para começar.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([empresaNome, carteiras]) => (
            <div key={empresaNome}>
              <div className="mb-2 flex items-center gap-2">
                <Building2 size={14} className="text-zinc-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {empresaNome}
                </span>
                <span className="text-xs text-zinc-600">
                  — {formatCnpj(carteiras[0].empresa.cnpj)}
                </span>
              </div>
              <div className="space-y-2">
                {carteiras.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Wallet size={18} className="shrink-0 text-indigo-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{c.name}</span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[c.type] ?? 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                            {c.type}
                          </span>
                          {!c.is_active && (
                            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">Inativa</span>
                          )}
                        </div>
                        {c.bank && (
                          <span className="text-xs text-zinc-500">{c.bank}</span>
                        )}
                        {c.description && (
                          <span className={`${c.bank ? 'ml-3' : ''} text-xs text-zinc-500`}>{c.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={isPending}
                        className="rounded p-1.5 text-zinc-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
