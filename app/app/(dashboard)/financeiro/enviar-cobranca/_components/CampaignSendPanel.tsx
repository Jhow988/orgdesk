'use client'

import { useState, useMemo, useTransition } from 'react'
import { enviarSendsAction } from '@/app/actions/campaign-send'
import { useRouter } from 'next/navigation'
import { Search, Send, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

type SendStatus = 'PENDING' | 'SENT' | 'FAILED' | 'NO_EMAIL' | 'NO_CADASTRO' | 'SIMULATED'

interface CampaignSend {
  id: string
  client_cnpj: string
  client_name: string
  emails: string[]
  status: SendStatus
  sent_at: Date | null
  open_count: number
  invoice: { id: string; number: string | null; amount: number } | null
  boleto: { id: string; amount: number } | null
}

interface Campaign {
  id: string
  label: string
  month_year: string
  status: string
  sends: CampaignSend[]
}

interface Props {
  campaigns: Campaign[]
  defaultCampaignId?: string
}

const STATUS_LABEL: Record<SendStatus, string> = {
  PENDING:     'Pendente',
  SENT:        'Enviado',
  FAILED:      'Falhou',
  NO_EMAIL:    'Sem e-mail',
  NO_CADASTRO: 'Sem cadastro',
  SIMULATED:   'Simulado',
}

const STATUS_CLASS: Record<SendStatus, string> = {
  PENDING:     'bg-yellow-900/50 text-yellow-400',
  SENT:        'bg-emerald-900/50 text-emerald-400',
  FAILED:      'bg-red-900/50 text-red-400',
  NO_EMAIL:    'bg-zinc-800 text-zinc-400',
  NO_CADASTRO: 'bg-zinc-800 text-zinc-500',
  SIMULATED:   'bg-blue-900/50 text-blue-400',
}

const PAGE_SIZE = 20

export function CampaignSendPanel({ campaigns, defaultCampaignId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? campaigns[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const campaign = campaigns.find(c => c.id === campaignId)
  const sends = campaign?.sends ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sends.filter(s => {
      const matchSearch = !q ||
        s.client_name.toLowerCase().includes(q) ||
        s.client_cnpj.includes(q) ||
        s.emails.some(e => e.toLowerCase().includes(q))
      const matchStatus = statusFilter === 'Todas' || s.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [sends, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleFilterChange(newSearch: string, newStatus: string) {
    setSearch(newSearch)
    setStatusFilter(newStatus)
    setPage(1)
  }

  const stats = useMemo(() => ({
    total:    sends.length,
    enviadas: sends.filter(s => s.status === 'SENT' || s.status === 'SIMULATED').length,
    pendentes: sends.filter(s => s.status === 'PENDING' || s.status === 'FAILED').length,
    semEmail: sends.filter(s => s.status === 'NO_EMAIL').length,
  }), [sends])

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(s => n.delete(s.id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(s => n.add(s.id)); return n })
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSend(ids: string[]) {
    startTransition(async () => {
      const res = await enviarSendsAction(ids)
      if (res.ok) {
        showToast(`${res.count} e-mail${res.count !== 1 ? 's' : ''} enviado${res.count !== 1 ? 's' : ''}!`)
        setSelected(new Set())
        router.refresh()
      } else {
        showToast(res.error ?? 'Erro ao enviar.')
      }
    })
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
        <p className="text-zinc-400">Nenhuma campanha criada.</p>
        <p className="mt-1 text-sm text-zinc-600">Vá em <strong className="text-zinc-400">Campanhas</strong> para criar uma.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-emerald-700 bg-emerald-900/80 px-4 py-2 text-sm text-emerald-300 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {/* Campaign header */}
      <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
            <Send size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-300">{campaign?.label ?? '—'}</p>
            <p className="text-xs text-zinc-500">
              {stats.total} registros · {campaign?.month_year}
            </p>
          </div>
        </div>
        <select
          value={campaignId}
          onChange={e => { setCampaignId(e.target.value); setSelected(new Set()); setPage(1) }}
          className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
        >
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'NFs no PDF', value: stats.total,    color: 'text-zinc-100' },
          { label: 'Enviadas',   value: stats.enviadas,  color: 'text-emerald-400' },
          { label: 'Pendentes',  value: stats.pendentes, color: 'text-yellow-400' },
          { label: 'Sem e-mail', value: stats.semEmail,  color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => handleFilterChange(e.target.value, statusFilter)}
            placeholder="Buscar nome, CNPJ, e-mail..."
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => handleFilterChange(search, e.target.value)}
          className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-200 focus:outline-none"
        >
          <option>Todas</option>
          <option value="PENDING">Pendente</option>
          <option value="SENT">Enviado</option>
          <option value="FAILED">Falhou</option>
          <option value="NO_EMAIL">Sem e-mail</option>
        </select>
        <button
          onClick={() => handleSend(filtered.filter(s => s.status === 'PENDING' || s.status === 'FAILED').map(s => s.id))}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <Send size={13} />
          Enviar Lote
        </button>
        <button
          onClick={() => router.refresh()}
          className="rounded-md border border-white/[0.08] p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-4 py-2">
          <span className="text-sm font-medium text-indigo-300">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
          <button
            onClick={() => handleSend(Array.from(selected))}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Send size={11} />
            Enviar Selecionados
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSelected(new Set())}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={12} /> Limpar seleção
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full text-sm bg-transparent">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="accent-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Cliente</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">CNPJ</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">E-mail</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">NFS</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Anexos</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : paginated.map(s => (
              <tr
                key={s.id}
                className={`border-b border-white/[0.06] last:border-0 transition-colors ${
                  selected.has(s.id) ? 'bg-indigo-500/5' : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    className="accent-indigo-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-100 truncate max-w-[180px] block">{s.client_name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {s.client_cnpj}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px] truncate">
                  {s.emails.length > 0 ? s.emails[0] : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {s.invoice ? `${s.invoice.number ? `Nº ${s.invoice.number}` : 'NF'}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {s.invoice && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-900/50 text-blue-300">NF</span>
                    )}
                    {s.boleto && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-violet-900/50 text-violet-300">Bol.</span>
                    )}
                    {!s.invoice && !s.boleto && <span className="text-zinc-600 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                  {s.status === 'SENT' && s.open_count > 0 && (
                    <span className="ml-1.5 text-[10px] text-zinc-500">👁 {s.open_count}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(s.status === 'PENDING' || s.status === 'FAILED') ? (
                    <button
                      onClick={() => handleSend([s.id])}
                      disabled={isPending}
                      className="rounded-md bg-emerald-600/20 border border-emerald-700/50 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 transition-colors"
                    >
                      Enviar
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600">
                      {s.sent_at ? new Date(s.sent_at).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-zinc-500">
            {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} registros
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-zinc-600">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] rounded px-2 py-1 text-xs transition-colors ${
                      currentPage === p
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
