'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Receipt, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { generateAsaasBoletoAction } from '@/app/actions/asaas-boleto'

interface Empresa {
  id: string
  name: string
  cnpj: string | null
  asaas_api_key: string | null
  asaas_environment: string
}

interface Client {
  id: string
  name: string
  cnpj: string | null
  email: string | null
}

interface Props {
  empresas: Empresa[]
  clients: Client[]
}

type Result = {
  success?: boolean
  boletoId?: string
  error?: string
}

export function BoletoForm({ empresas, clients }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(empresas[0]?.id ?? '')
  const [copied, setCopied] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId)
  const hasApiKey = Boolean(selectedEmpresa?.asaas_api_key)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res: Result = await generateAsaasBoletoAction(null, formData)
      if (res?.error) {
        setError(res.error)
      } else if (res?.success) {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-100">Boleto gerado com sucesso!</p>
            <p className="text-sm text-zinc-400">
              Acesse a listagem para ver a linha digitável e demais detalhes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/financeiro/boletos"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Ver listagem de boletos
          </Link>
          <button
            type="button"
            onClick={() => { setSuccess(false); setError(null) }}
            className="rounded-md border border-white/[0.1] bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors"
          >
            Gerar outro
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empresa */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Empresa *</label>
        <select
          name="empresa_id"
          required
          value={selectedEmpresaId}
          onChange={e => setSelectedEmpresaId(e.target.value)}
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
        >
          <option value="">Selecione uma empresa</option>
          {empresas.map(e => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.asaas_api_key
                ? ` (${e.asaas_environment === 'SANDBOX' ? 'Sandbox' : 'Produção'})`
                : ' — sem API Key'}
            </option>
          ))}
        </select>
        {selectedEmpresa && !hasApiKey && (
          <p className="flex items-center gap-1.5 text-xs text-yellow-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Configure a API Key do Asaas nas configurações da empresa
          </p>
        )}
      </div>

      {/* Cliente */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Cliente *</label>
        <select
          name="client_id"
          required
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
        >
          <option value="">Selecione um cliente</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.cnpj ? ` — ${c.cnpj}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Valor */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Valor (R$) *</label>
        <input
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="0,00"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
        />
      </div>

      {/* Vencimento */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Vencimento *</label>
        <input
          name="due_date"
          type="date"
          required
          min={today}
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        <input
          name="description"
          type="text"
          placeholder="Ex: Mensalidade março/2026"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
        />
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !hasApiKey}
        className="w-full rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Gerando...' : 'Gerar Boleto'}
      </button>
    </form>
  )
}
