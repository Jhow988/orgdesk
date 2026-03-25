'use client'

import { useState } from 'react'
import { MailOpen, Globe, Clock, Copy, Check, ExternalLink, Search } from 'lucide-react'

type SendStatus = 'PENDING' | 'SENT' | 'FAILED' | 'NO_EMAIL' | 'NO_CADASTRO' | 'SIMULATED'

interface Row {
  id:            string
  clientName:    string
  clientCnpj:    string
  campaignLabel: string
  campaignMonth: string
  status:        string
  sentAt:        string | null
  openCount:     number
  openedAt:      string | null
  portalAccess:  string | null
  portalUrl:     string | null
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Pendente',
  SENT:        'Enviado',
  FAILED:      'Falhou',
  NO_EMAIL:    'Sem e-mail',
  NO_CADASTRO: 'Sem cadastro',
  SIMULATED:   'Simulado',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:     'bg-yellow-400',
  SENT:        'bg-emerald-400',
  FAILED:      'bg-red-400',
  NO_EMAIL:    'bg-zinc-500',
  NO_CADASTRO: 'bg-zinc-500',
  SIMULATED:   'bg-blue-400',
}

function EmailStatusBadge({ status, openCount, openedAt }: { status: string; openCount: number; openedAt: string | null }) {
  if (status === 'NO_EMAIL' || status === 'NO_CADASTRO') {
    return <span className="text-xs text-zinc-600">Sem e-mail</span>
  }
  if (status === 'PENDING' || status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
        Não enviado
      </span>
    )
  }
  if (openCount > 0) {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <MailOpen size={10} />
          Aberto {openCount}×
        </span>
        {openedAt && <p className="mt-0.5 text-[11px] text-zinc-600">{openedAt}</p>}
      </div>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-600/20 px-2 py-0.5 text-xs text-yellow-500">
      Não aberto
    </span>
  )
}

function PortalCell({ portalUrl, portalAccess }: { portalUrl: string | null; portalAccess: string | null }) {
  const [copied, setCopied] = useState(false)

  if (!portalUrl) return <span className="text-xs text-zinc-600">—</span>

  function handleCopy() {
    navigator.clipboard.writeText(portalUrl!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleCopy}
        title="Copiar link do portal"
        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors"
      >
        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        {copied ? 'Copiado!' : 'Copiar link'}
      </button>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir portal"
        className="rounded-md p-1 text-zinc-600 hover:text-indigo-400 transition-colors"
      >
        <ExternalLink size={13} />
      </a>
      {portalAccess && (
        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 ml-0.5">
          <Globe size={10} />
          {portalAccess}
        </span>
      )}
    </div>
  )
}

export function RastreamentoTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r =>
    !search ||
    r.clientName.toLowerCase().includes(search.toLowerCase()) ||
    r.clientCnpj.includes(search) ||
    r.campaignLabel.toLowerCase().includes(search.toLowerCase())
  )

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-sm text-zinc-500">Nenhum registro encontrado.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente ou campanha…"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Campanha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                <span className="inline-flex items-center gap-1"><Clock size={11} /> Envio</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                <span className="inline-flex items-center gap-1"><MailOpen size={11} /> E-mail</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                <span className="inline-flex items-center gap-1"><Globe size={11} /> Portal do cliente</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(row => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-zinc-200 font-medium">{row.clientName}</p>
                  <p className="text-[11px] text-zinc-600 font-mono">{row.clientCnpj}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-zinc-300 text-xs">{row.campaignLabel}</p>
                  <p className="text-[11px] text-zinc-600">{row.campaignMonth}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[row.status] ?? 'bg-zinc-500'}`} />
                    <span className="text-xs text-zinc-400">{STATUS_LABEL[row.status] ?? row.status}</span>
                  </div>
                  {row.sentAt && <p className="mt-0.5 text-[11px] text-zinc-600">{row.sentAt}</p>}
                </td>
                <td className="px-4 py-3">
                  <EmailStatusBadge
                    status={row.status}
                    openCount={row.openCount}
                    openedAt={row.openedAt}
                  />
                </td>
                <td className="px-4 py-3">
                  <PortalCell portalUrl={row.portalUrl} portalAccess={row.portalAccess} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs text-zinc-600">
            Nenhum resultado para "{search}".
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-zinc-700 text-right">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
