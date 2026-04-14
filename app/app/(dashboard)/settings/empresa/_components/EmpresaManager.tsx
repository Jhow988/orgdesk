'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEmpresaAction, updateEmpresaAction, deleteEmpresaAction } from '@/app/actions/empresa'
import { Building2, Plus, Pencil, Trash2, X, Check } from 'lucide-react'

interface Empresa {
  id: string
  name: string
  cnpj: string
  email: string | null
  phone: string | null
  address: string | null
  is_active: boolean
  created_at: Date
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

interface EmpresaFormData {
  name: string
  cnpj: string
  email: string
  phone: string
  address: string
  is_active: boolean
}

const EMPTY_FORM: EmpresaFormData = {
  name: '', cnpj: '', email: '', phone: '', address: '', is_active: true,
}

export function EmpresaManager({ empresas: initial }: { empresas: Empresa[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Empresa | null>(null)
  const [form, setForm] = useState<EmpresaFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError(null)
    setShowCreate(true)
  }

  function openEdit(e: Empresa) {
    setForm({
      name: e.name,
      cnpj: formatCnpj(e.cnpj),
      email: e.email ?? '',
      phone: e.phone ?? '',
      address: e.address ?? '',
      is_active: e.is_active,
    })
    setEditing(e)
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
      const res = await createEmpresaAction(null, formData)
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateEmpresaAction(editing.id, {
        name: form.name,
        cnpj: form.cnpj,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        is_active: form.is_active,
      })
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a empresa "${name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await deleteEmpresaAction(id)
      router.refresh()
    })
  }

  const isFormOpen = showCreate || editing !== null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{initial.length} empresa(s) cadastrada(s)</p>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          <Plus size={14} />
          Nova Empresa
        </button>
      </div>

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              {editing ? 'Editar Empresa' : 'Nova Empresa'}
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
              <label className="mb-1 block text-xs text-zinc-400">Nome da empresa *</label>
              <input
                name="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Ex: Syall Tecnologia"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">CNPJ *</label>
              <input
                name="cnpj"
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: maskCnpj(e.target.value) }))}
                required
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                placeholder="contato@empresa.com.br"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Telefone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Endereço</label>
              <input
                name="address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Rua, número - Cidade/UF"
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
                <label htmlFor="is_active" className="text-sm text-zinc-300">Empresa ativa</label>
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
                {editing ? 'Salvar' : 'Criar Empresa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {initial.length === 0 && !isFormOpen ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <Building2 size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Nenhuma empresa cadastrada ainda.</p>
          <p className="mt-1 text-xs text-zinc-600">Clique em "Nova Empresa" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initial.map(empresa => (
            <div
              key={empresa.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Building2 size={18} className="shrink-0 text-indigo-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{empresa.name}</span>
                    {!empresa.is_active && (
                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">Inativa</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{formatCnpj(empresa.cnpj)}</span>
                  {empresa.email && (
                    <span className="ml-3 text-xs text-zinc-500">{empresa.email}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(empresa)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(empresa.id, empresa.name)}
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
