'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncReceivablesAction } from '@/app/actions/bling'

const STATUS_COLOR: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10',
  2: 'text-green-400 bg-green-400/10',
  3: 'text-zinc-400 bg-zinc-400/10',
  9: 'text-blue-400 bg-blue-400/10',
}

interface Receivable {
  id:              string
  bling_id:        string
  client_name:     string
  client_cnpj:     string | null
  document_number: string | null
  due_date:        string
  value:           string
  balance:         string
  status:          number
  status_label:    string
  category:        string | null
  description:     string | null
}

interface Props {
  blingConnected: boolean
  receivables:    Receivable[]
  totalValue:     number
  totalBalance:   number
  defaultFrom:    string
  defaultTo:      string
  defaultStatus:  string
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default function ReceivablesPanel({
  blingConnected, receivables, totalValue, totalBalance,
  defaultFrom, defaultTo, defaultStatus,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [from,   setFrom]   = useState(defaultFrom)
  const [to,     setTo]     = useState(defaultTo)
  const [status, setStatus] = useState(defaultStatus)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  function applyFilters() {
    const p = new URLSearchParams()
    if (from)            p.set('from',   from)
    if (to)              p.set('to',     to)
    if (status !== 'all') p.set('status', status)
    router.push(`/invoices?${p}`)
  }

  function handleSync() {
    setMsg(null)
    startTransition(async () => {
      const situacoes = status === 'all' ? [1, 2, 3, 9] : [Number(status)]
      const result = await syncReceivablesAction({
        dataVencimentoInicio: from || undefined,
        dataVencimentoFim:    to   || undefined,
        situacoes,
      })
      if (result.error) {
        setMsg({ text: `Erro: ${result.error}`, ok: false })
        return
      }
      setMsg({ text: `${result.upserted} registros importados com sucesso.`, ok: true })
      applyFilters()
    })
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Vencimento de</label>
          <input
            type="date" value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">até</label>
          <input
            type="date" value={to}
            onChange={e => setTo(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Situação</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">Todas</option>
            <option value="1">Em Aberto</option>
            <option value="2">Recebido</option>
            <option value="3">Cancelado</option>
            <option value="9">Parcial</option>
          </select>
        </div>

        <button
          onClick={applyFilters}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium"
        >
          Filtrar
        </button>

        <button
          onClick={handleSync}
          disabled={isPending || !blingConnected}
          className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span className={isPending ? 'animate-spin inline-block' : 'inline-block'}>⟳</span>
          Importar do Bling
        </button>

        {!blingConnected && (
          <p className="text-xs text-yellow-400 w-full">
            Bling não conectado. Vá em{' '}
            <a href="/clients" className="underline">Clientes</a> e conecte sua conta Bling.
          </p>
        )}
        {msg && (
          <p className={`text-xs w-full ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Summary cards */}
      {receivables.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Registros</p>
            <p className="text-2xl font-bold mt-1">{receivables.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Valor Total</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalValue)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Saldo em Aberto</p>
            <p className="text-2xl font-bold mt-1 text-yellow-400">{fmt(totalBalance)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {receivables.length === 0 ? (
          <p className="text-center text-zinc-500 py-12 text-sm">
            Nenhum registro. Clique em <strong className="text-white">Importar do Bling</strong> para carregar as contas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase">
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">CNPJ</th>
                <th className="px-4 py-3 text-left">Doc.</th>
                <th className="px-4 py-3 text-left">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {receivables.map(r => (
                <tr key={r.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{r.client_name}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {r.client_cnpj
                      ? r.client_cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{r.document_number ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{fmtDate(r.due_date)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(Number(r.value))}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(Number(r.balance))}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'text-zinc-400'}`}>
                      {r.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
