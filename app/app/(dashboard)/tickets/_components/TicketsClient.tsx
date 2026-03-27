'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Search, Plus, X, AlertCircle,
  Clock, CheckCircle2, CircleDot, RefreshCw,
} from 'lucide-react'
import { createTicketAction } from '@/app/actions/tickets'

// ─── Module-level client cache (1 min TTL) ─────────────────────────────────────
let _cachedClients: Client[] = []
let _cachedAt = 0
const CACHE_TTL = 60_000

async function getCachedClients(): Promise<Client[]> {
  if (_cachedClients.length > 0 && Date.now() - _cachedAt < CACHE_TTL) {
    return _cachedClients
  }
  const res = await fetch('/api/tickets/clients')
  if (!res.ok) return _cachedClients
  const rows: Client[] = await res.json()
  _cachedClients = rows
  _cachedAt = Date.now()
  return rows
}

type Status   = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface Ticket {
  id:           string
  number:       number
  title:        string
  status:       Status
  priority:     Priority
  category:     string | null
  clientName:   string
  clientCnpj:   string
  clientId:     string
  assigneeName: string | null
  messageCount: number
  createdAt:    string
  updatedAt:    string
  resolvedAt:   string | null
}

interface Client { id: string; name: string; cnpj: string }

interface Stats {
  total:         number
  open:          number
  inProgress:    number
  waitingClient: number
  resolved:      number
}

const STATUS_CFG: Record<Status, { label: string; dot: string; badge: string }> = {
  OPEN:           { label: 'Aberto',              dot: 'bg-blue-400',   badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  IN_PROGRESS:    { label: 'Em andamento',        dot: 'bg-yellow-400', badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  WAITING_CLIENT: { label: 'Aguardando cliente',  dot: 'bg-violet-400', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  RESOLVED:       { label: 'Resolvido',           dot: 'bg-emerald-400',badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  CLOSED:         { label: 'Fechado',             dot: 'bg-zinc-500',   badge: 'bg-zinc-700/40 border-zinc-700 text-zinc-500' },
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  LOW:      { label: 'Baixa',    color: 'text-zinc-400' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400' },
  HIGH:     { label: 'Alta',     color: 'text-orange-400' },
  CRITICAL: { label: 'Crítica',  color: 'text-red-400' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// ─── New Ticket Modal ──────────────────────────────────────────────────────────

function NewTicketModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void
  onCreated: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    clientId:  '',
    title:     '',
    body:      '',
    priority:  'MEDIUM',
    category:  '',
  })
  const [error,          setError]          = useState('')
  const [clientSearch,   setClientSearch]   = useState('')
  const [allClients,     setAllClients]     = useState<Client[]>([])
  const [clientOpen,     setClientOpen]     = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loadingClients, setLoadingClients] = useState(true)
  const clientInputRef = useRef<HTMLInputElement>(null)

  // Load cache on mount, refresh every minute
  useEffect(() => {
    let alive = true
    async function load() {
      setLoadingClients(true)
      const rows = await getCachedClients()
      if (alive) { setAllClients(rows); setLoadingClients(false) }
    }
    load()
    const interval = setInterval(async () => {
      _cachedAt = 0 // force refresh
      const rows = await getCachedClients()
      if (alive) setAllClients(rows)
    }, CACHE_TTL)
    return () => { alive = false; clearInterval(interval) }
  }, [])

  const q = clientSearch.trim().toLowerCase()
  const clientResults = q.length >= 3
    ? allClients.filter(c =>
        c.name.toLowerCase().startsWith(q) ||
        c.cnpj.replace(/\D/g, '').startsWith(q.replace(/\D/g, ''))
      ).slice(0, 60)
    : []

  function pickClient(c: Client) {
    setSelectedClient(c)
    setForm(f => ({ ...f, clientId: c.id }))
    setClientSearch('')
    setClientOpen(false)
  }

  function clearClient() {
    setSelectedClient(null)
    setForm(f => ({ ...f, clientId: '' }))
    setClientSearch('')
    setClientOpen(true)
    setTimeout(() => clientInputRef.current?.focus(), 0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId) { setError('Selecione um cliente'); return }
    if (!form.title.trim()) { setError('Informe o título'); return }
    if (!form.body.trim())  { setError('Descreva o chamado'); return }

    setError('')
    startTransition(async () => {
      try {
        const res = await createTicketAction({
          clientId:  form.clientId,
          title:     form.title.trim(),
          body:      form.body.trim(),
          priority:  form.priority,
          category:  form.category || undefined,
        })
        onCreated(res.id)
      } catch (err: any) {
        setError(err?.message ?? 'Erro ao criar chamado')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-zinc-100">Novo Chamado</h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client search */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">Cliente</label>
            {selectedClient && !clientOpen ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <span className="flex-1 text-xs text-zinc-200 truncate">{selectedClient.name}</span>
                <span className="text-[11px] text-zinc-600 font-mono shrink-0">{fmtCnpj(selectedClient.cnpj)}</span>
                <button type="button" onClick={clearClient}
                  className="rounded p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={12} className="absolute left-3 top-3.5 text-zinc-500 pointer-events-none" />
                <input
                  ref={clientInputRef}
                  type="text"
                  autoComplete="off"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientOpen(true) }}
                  onFocus={() => setClientOpen(true)}
                  onBlur={() => setTimeout(() => setClientOpen(false), 200)}
                  placeholder={loadingClients ? 'Carregando clientes…' : `Digite ao menos 3 letras para buscar… (${allClients.length} clientes)`}
                  disabled={loadingClients}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/40 focus:outline-none disabled:opacity-50"
                />
                {clientOpen && clientSearch.trim().length >= 3 && (
                  <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-white/[0.10] bg-zinc-900 shadow-2xl">
                    {clientResults.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-zinc-500">Nenhum resultado para &ldquo;{clientSearch}&rdquo;</p>
                    ) : clientResults.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => pickClient(c)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.03] last:border-0">
                        <span className="text-xs font-medium text-zinc-200">{c.name}</span>
                        <span className="text-[11px] text-zinc-600 font-mono">{fmtCnpj(c.cnpj)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">Título</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Resumo do problema…"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-zinc-400">Prioridade</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 focus:outline-none"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-zinc-400">Categoria (opcional)</label>
              <input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="ex: Financeiro"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">Descrição</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="Descreva o problema em detalhes…"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Criando…' : 'Criar chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function TicketsClient({
  tickets,
  stats,
}: {
  tickets: Ticket[]
  stats:   Stats
}) {
  const router = useRouter()
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showModal,      setShowModal]      = useState(false)

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter   !== 'all' && t.status   !== statusFilter)   return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.title.toLowerCase().includes(q) &&
          !t.clientName.toLowerCase().includes(q) &&
          !String(t.number).includes(q)) return false
    }
    return true
  }), [tickets, statusFilter, priorityFilter, search])

  const statCards = [
    { label: 'Total',            value: stats.total,         icon: MessageSquare, color: 'text-zinc-400' },
    { label: 'Abertos',          value: stats.open,          icon: CircleDot,     color: 'text-blue-400' },
    { label: 'Em andamento',     value: stats.inProgress,    icon: RefreshCw,     color: 'text-yellow-400' },
    { label: 'Aguard. cliente',  value: stats.waitingClient, icon: Clock,         color: 'text-violet-400' },
    { label: 'Resolvidos',       value: stats.resolved,      icon: CheckCircle2,  color: 'text-emerald-400' },
  ]

  return (
    <>
      {showModal && (
        <NewTicketModal
          onClose={() => setShowModal(false)}
          onCreated={id => { setShowModal(false); router.push(`/tickets/${id}`) }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {statCards.map(c => (
          <div key={c.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className={`mb-1 ${c.color}`}><c.icon size={15} /></div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nº, título ou cliente…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="OPEN">Aberto</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="WAITING_CLIENT">Aguardando cliente</option>
          <option value="RESOLVED">Resolvido</option>
          <option value="CLOSED">Fechado</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">Todas as prioridades</option>
          <option value="CRITICAL">Crítica</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </select>

        <button
          onClick={() => setShowModal(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus size={15} />
          Novo Chamado
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Título</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Responsável</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Msgs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(t => {
              const sc = STATUS_CFG[t.status]   ?? STATUS_CFG.OPEN
              const pc = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.MEDIUM
              return (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/tickets/${t.id}`)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">#{t.number}</td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="font-medium text-zinc-200 truncate">{t.title}</p>
                    {t.category && <p className="text-[11px] text-zinc-600">{t.category}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-zinc-300">{t.clientName}</p>
                    <p className="text-[11px] text-zinc-600 font-mono">{fmtCnpj(t.clientCnpj)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${pc.color}`}>{pc.label}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{t.assigneeName ?? <span className="text-zinc-700">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{t.messageCount}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-10 text-center">
            <AlertCircle size={20} className="mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">
              {tickets.length === 0 ? 'Nenhum chamado ainda.' : 'Nenhum chamado com esses filtros.'}
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-zinc-700 text-right">
        {filtered.length} chamado{filtered.length !== 1 ? 's' : ''}
      </p>
    </>
  )
}
