'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { activateCampaignAction, deleteCampaignAction } from '@/app/actions/campaigns'
import { Trash2, Play, ArrowRight, Loader2, FileText } from 'lucide-react'

interface Campaign {
  id: string
  label: string
  month_year: string
  status: string
  kb_nf: number | null
  kb_boleto: number | null
  created_at: string
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isActive = campaign.status === 'ACTIVE'

  function handleActivate() {
    setError(null)
    startTransition(async () => {
      const res = await activateCampaignAction(campaign.id)
      if (res?.error) setError(res.error)
    })
  }

  function handleDelete() {
    if (!confirm(`Excluir campanha ${campaign.label}?`)) return
    startTransition(async () => {
      const res = await deleteCampaignAction(campaign.id)
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className={`group relative rounded-xl border p-4 transition-colors ${
      isActive
        ? 'border-emerald-700/50 bg-emerald-950/20'
        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-2xl font-bold tracking-tight text-zinc-100">{campaign.label}</span>
          {isActive && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ATIVA
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-zinc-600 hover:text-red-400 disabled:opacity-30 transition-all"
          title="Excluir campanha"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Files row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <FileText size={11} className="text-zinc-500" />
          <span className="text-zinc-500">NFs</span>
          <span className="font-mono text-zinc-300">{campaign.kb_nf ? `${campaign.kb_nf.toFixed(0)} KB` : '—'}</span>
        </div>
        {campaign.kb_boleto ? (
          <>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5 text-xs">
              <FileText size={11} className="text-zinc-500" />
              <span className="text-zinc-500">Boletos</span>
              <span className="font-mono text-zinc-300">{campaign.kb_boleto.toFixed(0)} KB</span>
            </div>
          </>
        ) : null}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {/* Action */}
      {isActive ? (
        <button
          onClick={() => router.push(`/financeiro/enviar-cobranca?campaign=${campaign.id}`)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700/40 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
        >
          Ir para Envio <ArrowRight size={11} />
        </button>
      ) : (
        <button
          onClick={handleActivate}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-600/30 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Play size={10} />}
          {isPending ? 'Processando...' : 'Ativar e Enviar'}
        </button>
      )}

      <p className="mt-2 text-[10px] text-zinc-700">
        {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
      </p>
    </div>
  )
}
