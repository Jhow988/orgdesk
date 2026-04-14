'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Pencil, X, Upload, Plus } from 'lucide-react'
import { createClientAction, updateClientAction, type ClientUpdateData } from '@/app/actions/clients'
import { bulkUpdateEmailsAction, type BulkEmailResult } from '@/app/actions/bulk-update-emails'

interface Client {
  id:                 string
  cnpj:               string
  name:               string
  trade_name:         string | null
  email:              string | null
  email_boleto:       string | null
  phone:              string | null
  is_active:          boolean
  created_at:         string
  address_street:     string | null
  address_number:     string | null
  address_complement: string | null
  address_district:   string | null
  address_city:       string | null
  address_state:      string | null
  address_zip:        string | null
}

interface Props {
  clients: Client[]
}

const PAGE_SIZE = 20

function formatCpfCnpj(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return v
}

export function ClientsTable({ clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkEmailResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<ClientUpdateData & { cnpj: string }>({
    cnpj: '', name: '', trade_name: '', email: '', email_boleto: '', phone: '',
    address_street: '', address_number: '', address_complement: '',
    address_district: '', address_city: '', address_state: '', address_zip: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Client | null>(null)
  const [editForm, setEditForm] = useState<ClientUpdateData>({
    name: '', trade_name: '', email: '', email_boleto: '', phone: '',
    address_street: '', address_number: '', address_complement: '',
    address_district: '', address_city: '', address_state: '', address_zip: '',
  })

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.cnpj.includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.trade_name ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function maskCpfCnpj(value: string) {
    const d = value.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11) {
      // CPF: 000.000.000-00
      return d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2')
    }
    // CNPJ: 00.000.000/0000-00
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  function openCreate() {
    setCreateForm({
      cnpj: '', name: '', trade_name: '', email: '', email_boleto: '', phone: '',
      address_street: '', address_number: '', address_complement: '',
      address_district: '', address_city: '', address_state: '', address_zip: '',
    })
    setCreateError(null)
    setCreating(true)
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createClientAction(createForm)
      if (res.error) { setCreateError(res.error); return }
      setCreating(false)
      showToast('Cliente criado com sucesso.')
      router.refresh()
    })
  }

  function handleBulkUpdateEmails() {
    startTransition(async () => {
      const res = await bulkUpdateEmailsAction()
      if ('error' in res) { showToast(res.error, false); return }
      setBulkResult(res)
      router.refresh()
    })
  }

  function openEdit(c: Client) {
    setEditing(c)
    setEditForm({
      name:               c.name,
      trade_name:         c.trade_name         ?? '',
      email:              c.email              ?? '',
      email_boleto:       c.email_boleto       ?? '',
      phone:              c.phone              ?? '',
      address_street:     c.address_street     ?? '',
      address_number:     c.address_number     ?? '',
      address_complement: c.address_complement ?? '',
      address_district:   c.address_district   ?? '',
      address_city:       c.address_city       ?? '',
      address_state:      c.address_state      ?? '',
      address_zip:        c.address_zip        ?? '',
    })
  }

  function handleSaveEdit() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateClientAction(editing.id, editForm)
      if (res.error) {
        showToast(res.error, false)
      } else {
        setEditing(null)
        showToast('Cliente atualizado.')
        router.refresh()
      }
    })
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur ${
          toast.ok
            ? 'border-emerald-700 bg-emerald-900/80 text-emerald-300'
            : 'border-red-700 bg-red-900/80 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Create Client Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Novo Cliente</h2>
              <button onClick={() => setCreating(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>
            {createError && (
              <p className="mb-3 rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{createError}</p>
            )}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dados Gerais</p>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">CPF / CNPJ *</label>
                <input
                  type="text"
                  value={createForm.cnpj}
                  onChange={e => setCreateForm(f => ({ ...f, cnpj: maskCpfCnpj(e.target.value) }))}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>
              {([
                { label: 'Razão Social *',  key: 'name' },
                { label: 'Nome Fantasia',   key: 'trade_name' },
                { label: 'E-mail',          key: 'email' },
                { label: 'E-mail Cobrança', key: 'email_boleto' },
                { label: 'Telefone',        key: 'phone' },
              ] as { label: string; key: keyof typeof createForm }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-zinc-400">{label}</label>
                  <input
                    type="text"
                    value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                  />
                </div>
              ))}
              <p className="pt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Endereço</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-zinc-400">Logradouro</label>
                  <input type="text" value={createForm.address_street}
                    onChange={e => setCreateForm(f => ({ ...f, address_street: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Número</label>
                  <input type="text" value={createForm.address_number}
                    onChange={e => setCreateForm(f => ({ ...f, address_number: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              </div>
              {([
                { label: 'Complemento', key: 'address_complement' },
                { label: 'Bairro',      key: 'address_district' },
                { label: 'Cidade',      key: 'address_city' },
              ] as { label: string; key: keyof typeof createForm }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-zinc-400">{label}</label>
                  <input type="text" value={createForm[key]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">UF</label>
                  <input type="text" maxLength={2} value={createForm.address_state}
                    onChange={e => setCreateForm(f => ({ ...f, address_state: e.target.value.toUpperCase() }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">CEP</label>
                  <input type="text" value={createForm.address_zip}
                    onChange={e => setCreateForm(f => ({ ...f, address_zip: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {isPending ? 'Criando…' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Result Modal */}
      {bulkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-white/[0.1] bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Resultado — Atualização de Emails</h2>
              <button onClick={() => setBulkResult(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3">
                <div className="text-2xl font-bold text-emerald-400">{bulkResult.updated}</div>
                <div className="text-xs text-zinc-400">Atualizados</div>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="text-2xl font-bold text-zinc-400">{bulkResult.skipped}</div>
                <div className="text-xs text-zinc-400">Ignorados</div>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="text-2xl font-bold text-zinc-400">{bulkResult.notFound}</div>
                <div className="text-xs text-zinc-400">Não encontrados</div>
              </div>
            </div>
            {bulkResult.log.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-white/[0.08] bg-black/30 p-3">
                {bulkResult.log.map((l, i) => (
                  <p key={i} className="text-xs text-zinc-400 py-0.5">{l}</p>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setBulkResult(null)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Editar Cliente</h2>
              <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dados Gerais</p>
              {([
                { label: 'Razão Social *', key: 'name' },
                { label: 'Nome Fantasia',  key: 'trade_name' },
                { label: 'E-mail',         key: 'email' },
                { label: 'E-mail Cobrança',key: 'email_boleto' },
                { label: 'Telefone',       key: 'phone' },
              ] as { label: string; key: keyof ClientUpdateData }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-zinc-400">{label}</label>
                  <input
                    type="text"
                    value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
                  />
                </div>
              ))}
              <p className="pt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Endereço</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-zinc-400">Logradouro</label>
                  <input type="text" value={editForm.address_street}
                    onChange={e => setEditForm(f => ({ ...f, address_street: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Número</label>
                  <input type="text" value={editForm.address_number}
                    onChange={e => setEditForm(f => ({ ...f, address_number: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              </div>
              {([
                { label: 'Complemento', key: 'address_complement' },
                { label: 'Bairro',      key: 'address_district' },
                { label: 'Cidade',      key: 'address_city' },
              ] as { label: string; key: keyof ClientUpdateData }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-zinc-400">{label}</label>
                  <input type="text" value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">UF</label>
                  <input type="text" maxLength={2} value={editForm.address_state}
                    onChange={e => setEditForm(f => ({ ...f, address_state: e.target.value.toUpperCase() }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">CEP</label>
                  <input type="text" value={editForm.address_zip}
                    onChange={e => setEditForm(f => ({ ...f, address_zip: e.target.value }))}
                    className="w-full rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkUpdateEmails}
            disabled={isPending}
            title="Atualizar emails do CSV"
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] disabled:opacity-50 transition-colors"
          >
            <Upload size={12} />
            Atualizar Emails CSV
          </button>
          <button
            onClick={openCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 max-w-sm">
        <Search size={14} className="shrink-0 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar nome, CNPJ ou e-mail…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full text-sm bg-transparent">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {['Nome', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                </td>
              </tr>
            ) : paginated.map(c => (
              <tr
                key={c.id}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-100 truncate max-w-[200px]">{c.name}</div>
                  {c.trade_name && (
                    <div className="text-xs text-zinc-500 truncate max-w-[200px]">{c.trade_name}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {formatCpfCnpj(c.cnpj)}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400 truncate max-w-[180px]">
                  {c.email ?? <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {c.phone ?? <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.is_active
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-white/[0.08] text-zinc-500'
                  }`}>
                    {c.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-1 text-xs text-zinc-500">
          <span>
            {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="rounded px-2 py-1 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >«</button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            ><ChevronLeft size={14} /></button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="px-1 text-zinc-600">…</span>
                  : <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`min-w-[28px] rounded px-2 py-1 transition-colors ${
                        currentPage === p
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-white/[0.06]'
                      }`}
                    >{p}</button>
              )
            }

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            ><ChevronRight size={14} /></button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded px-2 py-1 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
            >»</button>
          </div>
        </div>
      )}
    </>
  )
}
