'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCategoriaAction, updateCategoriaAction, deleteCategoriaAction } from '@/app/actions/categoria-financeira'
import { Tag, Plus, Pencil, Trash2, X, Check } from 'lucide-react'

interface Categoria {
  id: string
  name: string
  type: string
  color: string
  is_active: boolean
}

interface CategoriaFormData {
  name: string
  type: string
  color: string
  is_active: boolean
}

const EMPTY_FORM: CategoriaFormData = {
  name: '',
  type: 'AMBOS',
  color: '#6366f1',
  is_active: true,
}

const TYPE_OPTIONS = [
  { value: 'AMBOS', label: 'Ambos (Pagar e Receber)' },
  { value: 'PAGAR', label: 'Pagar' },
  { value: 'RECEBER', label: 'Receber' },
]

const TYPE_BADGE: Record<string, string> = {
  PAGAR: 'bg-red-900/40 text-red-300 border-red-800',
  RECEBER: 'bg-green-900/40 text-green-300 border-green-800',
  AMBOS: 'bg-blue-900/40 text-blue-300 border-blue-800',
}

const TYPE_LABEL: Record<string, string> = {
  PAGAR: 'Pagar',
  RECEBER: 'Receber',
  AMBOS: 'Ambos',
}

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function CategoriaManager({ categorias: initial }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [form, setForm] = useState<CategoriaFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError(null)
    setShowCreate(true)
  }

  function openEdit(c: Categoria) {
    setForm({
      name: c.name,
      type: c.type,
      color: c.color,
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
      const res = await createCategoriaAction(null, formData)
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateCategoriaAction(editing.id, {
        name: form.name,
        type: form.type,
        color: form.color,
        is_active: form.is_active,
      })
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a categoria "${name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await deleteCategoriaAction(id)
      router.refresh()
    })
  }

  const isFormOpen = showCreate || editing !== null

  const inputCls = 'w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none'
  const labelCls = 'mb-1 block text-xs text-zinc-400'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{initial.length} categoria(s) cadastrada(s)</p>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Plus size={14} />
          Nova Categoria
        </button>
      </div>

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              {editing ? 'Editar Categoria' : 'Nova Categoria'}
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
            <div>
              <label className={labelCls}>Nome *</label>
              <input
                name="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ex: Fornecedores"
              />
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

            <div className="sm:col-span-2">
              <label className={labelCls}>Cor</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    title={c}
                  />
                ))}
                <input
                  name="color"
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="h-7 w-10 cursor-pointer rounded border border-zinc-600 bg-zinc-700 p-0.5"
                  title="Cor personalizada"
                />
                <span className="text-xs text-zinc-500">{form.color}</span>
              </div>
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
                <label htmlFor="is_active" className="text-sm text-zinc-300">Categoria ativa</label>
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
                {editing ? 'Salvar' : 'Criar Categoria'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {initial.length === 0 && !isFormOpen ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <Tag size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Nenhuma categoria cadastrada.</p>
          <p className="mt-1 text-xs text-zinc-600">Clique em "Nova Categoria" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map(cat => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/10"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{cat.name}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[cat.type] ?? 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                    {TYPE_LABEL[cat.type] ?? cat.type}
                  </span>
                  {!cat.is_active && (
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">Inativa</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(cat)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
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
      )}
    </div>
  )
}
