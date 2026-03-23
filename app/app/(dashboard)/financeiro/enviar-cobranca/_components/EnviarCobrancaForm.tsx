'use client'

import { useActionState, useState } from 'react'
import type { CobrancaState } from '@/app/actions/cobranca'

interface Props {
  action: (prev: CobrancaState, data: FormData) => Promise<CobrancaState>
  clients: { id: string; name: string; email: string | null }[]
}

export function EnviarCobrancaForm({ action, clients }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const [tipo, setTipo] = useState<'PIX' | 'BOLETO'>('PIX')

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">Tipo de cobrança *</label>
        <div className="flex gap-3">
          {(['PIX', 'BOLETO'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                tipo === t
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
              }`}
            >
              {t === 'PIX' ? '⚡ PIX' : '📄 Boleto'}
            </button>
          ))}
        </div>
        <input type="hidden" name="tipo" value={tipo} />
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
              {c.name}{c.email ? ` — ${c.email}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Descrição *</label>
        <input
          name="descricao"
          required
          placeholder="Ex: Mensalidade abril/2026"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Valor */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Valor (R$) *</label>
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0,00"
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>

        {/* Vencimento */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">
            {tipo === 'BOLETO' ? 'Vencimento *' : 'Expira em'}
          </label>
          <input
            name="vencimento"
            type="date"
            required={tipo === 'BOLETO'}
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Chave PIX — só para PIX */}
      {tipo === 'PIX' && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Chave PIX</label>
          <input
            name="pix_key"
            placeholder="CPF, CNPJ, e-mail ou chave aleatória"
            className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>
      )}

      {/* Observações */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          placeholder="Informações adicionais para o cliente..."
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Gerando cobrança...' : `Gerar cobrança ${tipo === 'PIX' ? 'PIX' : 'Boleto'}`}
      </button>
    </form>
  )
}
