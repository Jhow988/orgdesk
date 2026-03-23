'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { activateCampaignAction, deleteCampaignAction } from '@/app/actions/campaigns'
import { Calendar, FileText, Trash2, Play, ArrowRight, Loader2 } from 'lucide-react'

interface Campaign {
  id: string
  label: string
  month_year: string
  status: string
  kb_nf: number | null
  kb_boleto: number | null
  created_at: Date
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
      // redirect happens inside action on success
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
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      isActive
        ? 'border-emerald-700/50 bg-emerald-950/20'
        : 'border-white/[0.08] bg-white/[0.03]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className={isActive ? 'text-emerald-400' : 'text-zinc-500'} />
          <span className="text-lg font-bold text-zinc-100">{campaign.label}</span>
        </div>
        {isActive && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ATIVA
          </span>
        )}
      </div>

      {/* Files info */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <FileText size={11} className="text-zinc-500" />
          <span className="text-zinc-400">NFs:</span>
          <span className="text-zinc-200 font-mono">
            {campaign.kb_nf ? `${campaign.kb_nf.toFixed(1)} KB` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <FileText size={11} className={campaign.kb_boleto ? 'text-zinc-500' : 'text-zinc-700'} />
          <span className={campaign.kb_boleto ? 'text-zinc-400' : 'text-zinc-600'}>Boletos:</span>
          <span className={campaign.kb_boleto ? 'text-zinc-200 font-mono' : 'text-zinc-600'}>
            {campaign.kb_boleto ? `${campaign.kb_boleto.toFixed(1)} KB` : 'Sem boletos'}
          </span>
        </div>
      </div>

      {/* Created at */}
      <p className="text-[11px] text-zinc-600">
        🕐 {new Date(campaign.created_at).toLocaleString('pt-BR')}
      </p>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {isActive ? (
          <button
            onClick={() => router.push(`/financeiro/enviar-cobranca?campaign=${campaign.id}`)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600/20 border border-emerald-700/50 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
          >
            ✓ Ativa — Ir para NFs <ArrowRight size={11} />
          </button>
        ) : (
          <button
            onClick={handleActivate}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} />}
            {isPending ? 'Processando...' : 'Ativar e Enviar'}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md border border-white/[0.08] p-1.5 text-zinc-500 hover:border-red-800 hover:text-red-400 disabled:opacity-50 transition-colors"
          title="Excluir campanha"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
