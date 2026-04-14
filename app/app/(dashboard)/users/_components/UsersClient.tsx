'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Pencil, X, Eye, EyeOff, ShieldCheck, Search } from 'lucide-react'
import { createUserAction, updateUserAction, toggleUserAction } from '@/app/actions/users'

const ROLES = [
  { value: 'ORG_ADMIN',   label: 'Administrador' },
  { value: 'ORG_FINANCE', label: 'Financeiro' },
  { value: 'ORG_SUPPORT', label: 'Suporte' },
]

const ROLE_COLOR: Record<string, string> = {
  ORG_ADMIN:   'bg-violet-500/10 text-violet-400 border-violet-500/25',
  ORG_FINANCE: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  ORG_SUPPORT: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
}

interface OrgUser {
  membership_id: string
  user_id:       string
  name:          string
  email:         string
  role:          string
  role_label:    string
  is_active:     boolean
  last_login_at: string | null
  created_at:    string
}

interface Props {
  users:        OrgUser[]
  currentUserId: string
}

// ─── Form (create / edit) ─────────────────────────────────────────────────────

function UserFormModal({
  editing,
  onClose,
  onDone,
}: {
  editing: OrgUser | null
  onClose: () => void
  onDone:  () => void
}) {
  const [name,        setName]        = useState(editing?.name  ?? '')
  const [email,       setEmail]       = useState(editing?.email ?? '')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [role,        setRole]        = useState(editing?.role ?? 'ORG_FINANCE')
  const [error,       setError]       = useState('')
  const [isPending,   startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = editing
        ? await updateUserAction(editing.user_id, name, role, password || undefined)
        : await createUserAction(name, email, password, role)
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              {editing ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Nome
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
            />
          </div>

          {!editing && (
            <div>
              <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {editing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={editing ? '••••••' : 'Mínimo 6 caracteres'}
                required={!editing}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Perfil
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 focus:border-white/20 focus:outline-none"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function UsersClient({ users: initial, currentUserId }: Props) {
  const router = useRouter()
  const [users,        setUsers]     = useState(initial)
  const [modal,        setModal]     = useState<'new' | OrgUser | null>(null)
  const [toggling,     setToggling]  = useState<string | null>(null)
  const [toast,        setToast]     = useState<string | null>(null)
  const [search,       setSearch]    = useState('')
  const [roleFilter,   setRole]      = useState('ALL')
  const [statusFilter, setStatus]    = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initial.filter(u => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (statusFilter === 'ACTIVE' && !u.is_active) return false
      if (statusFilter === 'INACTIVE' && u.is_active) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [initial, search, roleFilter, statusFilter])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleDone() {
    setModal(null)
    router.refresh()
  }

  async function handleToggle(user: OrgUser) {
    setToggling(user.user_id)
    const res = await toggleUserAction(user.user_id)
    setToggling(null)
    if (res.error) { showToast(res.error); return }
    router.refresh()
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-sm text-zinc-300 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {modal && (
        <UserFormModal
          editing={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Usuários</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {initial.length} usuário{initial.length !== 1 ? 's' : ''} na organização
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <UserPlus size={15} />
          Novo usuário
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1">
          {[{ value: 'ALL', label: 'Todos' }, ...ROLES].map(r => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === r.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15]'
              }`}
            >
              {s === 'ALL' ? 'Todos' : s === 'ACTIVE' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-zinc-600">{filtered.length} de {initial.length}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              <th className="px-5 py-3">Usuário</th>
              <th className="px-5 py-3">Perfil</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Último acesso</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                  {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Nenhum usuário encontrado para os filtros aplicados.'
                    : 'Nenhum usuário cadastrado.'}
                </td>
              </tr>
            ) : filtered.map(u => (
              <tr
                key={u.user_id}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Usuário */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-semibold text-zinc-300">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">{u.name}</p>
                      <p className="text-[11px] text-zinc-500">{u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Perfil */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ROLE_COLOR[u.role] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    <ShieldCheck size={10} />
                    {u.role_label}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    {u.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>

                {/* Último acesso */}
                <td className="px-5 py-3.5 text-xs text-zinc-500">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Nunca acessou'}
                </td>

                {/* Ações */}
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setModal(u)}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <Pencil size={11} /> Editar
                    </button>
                    {u.user_id !== currentUserId && (
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={toggling === u.user_id}
                        className={`text-xs transition-colors disabled:opacity-40 ${u.is_active ? 'text-red-500 hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                      >
                        {toggling === u.user_id ? '…' : u.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
