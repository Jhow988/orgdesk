'use client'

import { useState } from 'react'
import { FileText, Download, LogIn, Globe } from 'lucide-react'
import { verifyPortalAccessAction } from '@/app/actions/portal'

interface Send {
  id:            string
  campaignId:    string
  campaignLabel: string
  nf_pages:      number[]
  boleto_pages:  number[]
  sent_at:       string | null
}

interface PortalData {
  clientName: string
  clientCnpj: string
  sends:      Send[]
}

function formatCnpjInput(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function VerifyForm({ token, onSuccess }: { token: string; onSuccess: (d: PortalData) => void }) {
  const [email, setEmail]   = useState('')
  const [cnpj,  setCnpj]    = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await verifyPortalAccessAction(token, email, cnpj)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.data)   onSuccess(result.data)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Globe size={22} className="text-indigo-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Portal do Cliente</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Informe seu e-mail e CNPJ para acessar seus documentos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="financeiro@suaempresa.com.br"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">CNPJ</label>
            <input
              type="text"
              required
              inputMode="numeric"
              value={cnpj}
              onChange={e => setCnpj(formatCnpjInput(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-colors font-mono"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <LogIn size={15} />
            {loading ? 'Verificando…' : 'Acessar documentos'}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-zinc-700">
          Em caso de dúvidas, entre em contato pelo e-mail{' '}
          <a href="mailto:financeiro@syall.com.br" className="text-zinc-500 hover:text-zinc-400 transition-colors">
            financeiro@syall.com.br
          </a>
        </p>
      </div>
    </div>
  )
}

function DocumentsList({ data, token }: { data: PortalData; token: string }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">{data.clientName}</h1>
        <p className="mt-1 text-sm text-zinc-500">CNPJ {data.clientCnpj}</p>
      </div>

      {data.sends.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum documento disponível no momento.</p>
          <p className="mt-1 text-xs text-zinc-700">
            Em caso de dúvidas, contate{' '}
            <a href="mailto:financeiro@syall.com.br" className="text-zinc-600 hover:text-zinc-400 transition-colors">
              financeiro@syall.com.br
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.sends.map(send => (
            <div
              key={send.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{send.campaignLabel}</p>
                {send.sent_at && (
                  <p className="mt-0.5 text-xs text-zinc-600">Enviado em {send.sent_at}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {send.nf_pages.length > 0 && (
                  <a
                    href={`/api/c/${token}/pdf?campaignId=${send.campaignId}&type=nf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <FileText size={12} />
                    NFS ({send.nf_pages.length} pág.)
                    <Download size={11} className="ml-0.5 opacity-60" />
                  </a>
                )}
                {send.boleto_pages.length > 0 && (
                  <a
                    href={`/api/c/${token}/pdf?campaignId=${send.campaignId}&type=boleto`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                  >
                    <FileText size={12} />
                    Boleto
                    <Download size={11} className="ml-0.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PortalGate({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null)

  if (data) return <DocumentsList data={data} token={token} />
  return <VerifyForm token={token} onSuccess={setData} />
}
