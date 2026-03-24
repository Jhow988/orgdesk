'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Link2, Link2Off } from 'lucide-react'
import { syncBlingAction, getBlingConnectUrlAction, disconnectBlingAction } from '@/app/actions/bling'

interface Client {
  id:         string
  cnpj:       string
  name:       string
  trade_name: string | null
  email:      string | null
  phone:      string | null
  is_active:  boolean
  bling_id:   string | null
  created_at: string
}

interface Props {
  clients:        Client[]
  blingConnected: boolean
  lastSyncAt:     string | null
  flashConnected: boolean
  flashError?:    string
}

const PAGE_SIZE = 20

function formatCnpj(v: string) {
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function ClientsTable({ clients, blingConnected, lastSyncAt, flashConnected, flashError }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null)

  // Show flash messages from OAuth redirect
  useEffect(() => {
    if (flashConnected) showToast('Bling conectado com sucesso!')
    else if (flashError)  showToast(`Erro ao conectar Bling: ${flashError}`, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function handleSync() {
    startTransition(async () => {
      const res = await syncBlingAction()
      if (res.error) {
        showToast(res.error, false)
      } else {
        showToast(`${res.upserted} cliente(s) sincronizados, ${res.skipped} ignorados.`)
        router.refresh()
      }
    })
  }

  function handleConnect() {
    startTransition(async () => {
      const res = await getBlingConnectUrlAction()
      if (res.url) window.location.href = res.url
      else showToast(res.error ?? 'Erro ao conectar.', false)
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectBlingAction()
      showToast('Bling desconectado.')
      router.refresh()
    })
  }

  const syncedCount = clients.filter(c => c.bling_id).length

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

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            {syncedCount > 0 && (
              <span className="ml-2 text-xs text-indigo-400">· {syncedCount} do Bling</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {blingConnected ? (
            <>
              {lastSyncAt && (
                <span className="text-xs text-zinc-500">
                  Sync: {new Date(lastSyncAt).toLocaleString('pt-BR')}
                </span>
              )}
              <button
                onClick={handleSync}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
                Sincronizar Bling
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 transition-colors"
              >
                <Link2Off size={12} />
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
            >
              <Link2 size={13} />
              Conectar Bling
            </button>
          )}
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
              {['Nome', 'CNPJ', 'E-mail', 'Telefone', 'Status', 'Bling'].map(h => (
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
                  {search ? 'Nenhum cliente encontrado.' : (
                    <div>
                      <p>Nenhum cliente cadastrado.</p>
                      {!blingConnected && (
                        <p className="mt-1 text-xs text-zinc-600">
                          Conecte o Bling para importar seus clientes automaticamente.
                        </p>
                      )}
                    </div>
                  )}
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
                  {formatCnpj(c.cnpj)}
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
                <td className="px-4 py-3">
                  {c.bling_id
                    ? <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-900/50 text-indigo-400">Sincronizado</span>
                    : <span className="text-xs text-zinc-600">—</span>
                  }
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
