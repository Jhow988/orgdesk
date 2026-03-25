'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { activateCampaignAction, deleteCampaignAction, previewCampaignAction } from '@/app/actions/campaigns'
import { Trash2, Play, ArrowRight, Loader2, FileText, X, CheckCircle, AlertCircle, Mail } from 'lucide-react'

interface Campaign {
  id: string
  label: string
  month_year: string
  status: string
  kb_nf: number | null
  kb_boleto: number | null
  created_at: string
}

interface CampaignMatch {
  cnpj:        string
  clientName:  string
  email:       string | null
  nfPages:     number[]
  boletoPages: number[]
  hasBoth:     boolean
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CampaignMatch[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const isActive = campaign.status === 'ACTIVE'

  function handlePreview() {
    setError(null)
    setPreviewLoading(true)
    startTransition(async () => {
      const res = await previewCampaignAction(campaign.id)
      setPreviewLoading(false)
      if (res.error) { setError(res.error); return }
      setPreview(res.matches ?? [])
    })
  }

  function handleConfirm() {
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

  const withEmail    = preview?.filter(m => m.email) ?? []
  const withoutEmail = preview?.filter(m => !m.email) ?? []

  return (
    <>
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
            onClick={handlePreview}
            disabled={isPending || previewLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-600/30 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-50 transition-colors"
          >
            {(isPending || previewLoading) ? <Loader2 size={11} className="animate-spin" /> : <Play size={10} />}
            {(isPending || previewLoading) ? 'Analisando PDFs...' : 'Ativar e Enviar'}
          </button>
        )}

        <p className="mt-2 text-[10px] text-zinc-700">
          {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Preview modal */}
      {preview !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Prévia da Campanha {campaign.label}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {preview.length} cliente{preview.length !== 1 ? 's' : ''} encontrado{preview.length !== 1 ? 's' : ''}
                  {withEmail.length > 0 && <> · <span className="text-emerald-400">{withEmail.length} com e-mail</span></>}
                  {withoutEmail.length > 0 && <> · <span className="text-amber-400">{withoutEmail.length} sem e-mail</span></>}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              {preview.length === 0 ? (
                <p className="p-8 text-center text-sm text-zinc-500">Nenhum cliente encontrado nos PDFs.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900 border-b border-white/[0.06]">
                    <tr className="text-left text-zinc-500">
                      <th className="px-4 py-2 font-medium">Cliente</th>
                      <th className="px-4 py-2 font-medium">CNPJ</th>
                      <th className="px-4 py-2 font-medium">E-mail</th>
                      <th className="px-4 py-2 font-medium text-center">NFs</th>
                      <th className="px-4 py-2 font-medium text-center">Boleto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(m => (
                      <tr key={m.cnpj} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-zinc-200 max-w-[180px] truncate">{m.clientName}</td>
                        <td className="px-4 py-2 font-mono text-zinc-400">{m.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</td>
                        <td className="px-4 py-2">
                          {m.email ? (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <Mail size={10} className="text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{m.email}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500">
                              <AlertCircle size={10} />
                              Sem e-mail
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-zinc-400">
                          {m.nfPages.length > 0 ? `p. ${m.nfPages.join(', ')}` : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-4 py-2 text-center text-zinc-400">
                          {m.boletoPages.length > 0 ? `p. ${m.boletoPages[0]}` : <span className="text-zinc-700">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/[0.08]">
              <p className="text-[11px] text-zinc-600">
                Apenas clientes com e-mail cadastrado receberão o envio.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending || withEmail.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                  {isPending ? 'Ativando...' : `Confirmar Envio (${withEmail.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
