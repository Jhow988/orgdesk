'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCentroCustoAction, updateCentroCustoAction, deleteCentroCustoAction } from '@/app/actions/centro-custo'
import { FolderKanban, Plus, Pencil, Trash2, X, Check } from 'lucide-react'

interface CentroCusto {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface CentroCustoFormData {
  name: string
  description: string
  is_active: boolean
}

const EMPTY_FORM: CentroCustoFormData = {
  name: '',
  description: '',
  is_active: true,
}

export function CentroCustoManager({ centros: initial }: { centros: CentroCusto[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<CentroCusto | null>(null)
  const [form, setForm] = useState<CentroCustoFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError(null)
    setShowCreate(true)
  }

  function openEdit(c: CentroCusto) {
    setForm({
      name: c.name,
      description: c.description ?? '',
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
      const res = await createCentroCustoAction(null, formData)
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateCentroCustoAction(editing.id, {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
      })
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o centro de custo "${name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await deleteCentroCustoAction(id)
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
        <p className="text-sm text-zinc-400">{initial.length} centro(s) de custo cadastrado(s)</p>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Plus size={14} />
          Novo Centro de Custo
        </button>
      </div>

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              {editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
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
                placeholder="Ex: Administrativo"
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
                <label htmlFor="is_active" className="text-sm text-zinc-300">Centro de custo ativo</label>
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
                {editing ? 'Salvar' : 'Criar Centro de Custo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {initial.length === 0 && !isFormOpen ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <FolderKanban size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Nenhum centro de custo cadastrado.</p>
          <p className="mt-1 text-xs text-zinc-600">Clique em "Novo Centro de Custo" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map(centro => (
            <div
              key={centro.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <FolderKanban size={18} className="shrink-0 text-indigo-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{centro.name}</span>
                    {!centro.is_active && (
                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">Inativo</span>
                    )}
                  </div>
                  {centro.description && (
                    <span className="text-xs text-zinc-500">{centro.description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(centro)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(centro.id, centro.name)}
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
