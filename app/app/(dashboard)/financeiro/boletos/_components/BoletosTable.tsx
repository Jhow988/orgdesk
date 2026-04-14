'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Receipt, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import type { BoletoStatus } from '@prisma/client'
import {
  cancelAsaasBoletoAction,
  markBoletoPaidManualAction,
} from '@/app/actions/asaas-boleto'

interface Client {
  id: string
  name: string
  cnpj: string | null
}

interface Empresa {
  id: string
  name: string
  cnpj: string | null
}

interface Boleto {
  id: string
  status: BoletoStatus | string
  amount: number | string
  due_date: Date | string
  description: string | null
  asaas_url: string | null
  asaas_digitavel: string | null
  client: Client
  empresa: Empresa | null
}

interface Props {
  boletos: Boleto[]
  empresas: { id: string; name: string; cnpj: string | null }[]
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendente',  className: 'bg-yellow-900/50 text-yellow-400' },
  PAID:      { label: 'Pago',      className: 'bg-emerald-900/50 text-emerald-400' },
  OVERDUE:   { label: 'Vencido',   className: 'bg-red-900/50 text-red-400' },
  CANCELLED: { label: 'Cancelado', className: 'bg-zinc-800 text-zinc-400' },
}

function resolveStatus(boleto: Boleto): string {
  if (boleto.status === 'PENDING') {
    const due = new Date(boleto.due_date)
    due.setHours(23, 59, 59, 999)
    if (due < new Date()) return 'OVERDUE'
  }
  return boleto.status
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.PENDING
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export function BoletosTable({ boletos, empresas }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') ?? ''
  const currentEmpresa = searchParams.get('empresa_id') ?? ''

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/financeiro/boletos?${params.toString()}`)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function handleCancel(id: string) {
    if (!confirm('Tem certeza que deseja cancelar este boleto? Esta ação não pode ser desfeita.')) return
    startTransition(async () => {
      await cancelAsaasBoletoAction(id)
      router.refresh()
    })
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      await markBoletoPaidManualAction(id)
      router.refresh()
    })
  }

  // Summary cards — use resolved status for OVERDUE
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pending = boletos.filter(b => {
    if (b.status !== 'PENDING') return false
    const due = new Date(b.due_date)
    due.setHours(23, 59, 59, 999)
    return due >= new Date()
  })
  const paid = boletos.filter(b => b.status === 'PAID')
  const overdue = boletos.filter(b => {
    if (b.status !== 'PENDING') return false
    const due = new Date(b.due_date)
    due.setHours(23, 59, 59, 999)
    return due < new Date()
  })

  function sumAmount(list: Boleto[]) {
    return list.reduce((s, b) => s + Number(b.amount), 0)
  }

  function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pendente</p>
          <p className="mt-1 text-xl font-bold text-yellow-400">{fmtBRL(sumAmount(pending))}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{pending.length} boleto{pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pago</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{fmtBRL(sumAmount(paid))}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{paid.length} boleto{paid.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Vencido</p>
          <p className="mt-1 text-xl font-bold text-red-400">{fmtBRL(sumAmount(overdue))}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{overdue.length} boleto{overdue.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={currentStatus}
          onChange={e => updateFilter('status', e.target.value)}
          className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-white/20"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={currentEmpresa}
          onChange={e => updateFilter('empresa_id', e.target.value)}
          className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-white/20"
        >
          <option value="">Todas as empresas</option>
          {empresas.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        {boletos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Receipt className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum boleto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Linha Digitável</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {boletos.map(b => {
                  const resolvedStatus = resolveStatus(b)
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <p className="text-zinc-200 font-medium">{b.client.name}</p>
                        {b.client.cnpj && (
                          <p className="text-xs text-zinc-500 font-mono">{b.client.cnpj}</p>
                        )}
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3 text-zinc-400">{b.empresa?.name ?? '—'}</td>

                      {/* Vencimento */}
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(b.due_date).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 font-mono text-zinc-100">
                        {Number(b.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={resolvedStatus} />
                      </td>

                      {/* Linha digitável */}
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono max-w-[180px]">
                        {b.asaas_digitavel ? (
                          <span className="truncate block" title={b.asaas_digitavel}>
                            {b.asaas_digitavel.slice(0, 20)}…
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.asaas_url && (
                            <a
                              href={b.asaas_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver Boleto"
                              className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}

                          {b.asaas_digitavel && (
                            <button
                              onClick={() => copyToClipboard(b.asaas_digitavel!)}
                              title="Copiar Linha"
                              className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}

                          {resolvedStatus === 'PENDING' || resolvedStatus === 'OVERDUE' ? (
                            <>
                              <button
                                onClick={() => handleMarkPaid(b.id)}
                                disabled={isPending}
                                title="Marcar como Pago"
                                className="rounded p-1 text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleCancel(b.id)}
                                disabled={isPending}
                                title="Cancelar"
                                className="rounded p-1 text-zinc-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
