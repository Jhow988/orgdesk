'use client'

import { useState } from 'react'
import { MailOpen, Globe, Clock, Copy, Check, ExternalLink, Search, FileText, Download, ChevronDown, X } from 'lucide-react'

interface Row {
  id:                 string
  clientName:         string
  clientCnpj:         string
  campaignLabel:      string
  campaignMonth:      string
  status:             string
  sentAt:             string | null
  openCount:          number
  openedAt:           string | null
  portalAccess:       string | null
  portalUrl:          string | null
  boletoDownloadedAt: string | null
  nfDownloadedAt:     string | null
  hasNf:              boolean
  hasBoleto:          boolean
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

// ─── Filter helpers ───────────────────────────────────────────────────────────

type EnvioFilter   = 'all' | 'SENT' | 'PENDING' | 'FAILED' | 'NO_EMAIL' | 'NO_CADASTRO' | 'SIMULATED'
type EmailFilter   = 'all' | 'aberto' | 'nao_aberto' | 'nao_enviado'
type PortalFilter  = 'all' | 'acessou' | 'nunca'
type BoletoFilter  = 'all' | 'baixado' | 'nao_baixado'
type NfFilter      = 'all' | 'baixada' | 'nao_baixada'

function matchEnvio(r: Row, f: EnvioFilter) {
  if (f === 'all') return true
  return r.status === f
}

function matchEmail(r: Row, f: EmailFilter) {
  if (f === 'all') return true
  if (f === 'nao_enviado') return r.status === 'PENDING' || r.status === 'FAILED' || r.status === 'NO_EMAIL' || r.status === 'NO_CADASTRO'
  if (f === 'aberto')      return r.openCount > 0
  if (f === 'nao_aberto')  return (r.status === 'SENT' || r.status === 'SIMULATED') && r.openCount === 0
  return true
}

function matchPortal(r: Row, f: PortalFilter) {
  if (f === 'all')    return true
  if (f === 'acessou') return !!r.portalAccess
  if (f === 'nunca')   return !r.portalAccess
  return true
}

function matchBoleto(r: Row, f: BoletoFilter) {
  if (f === 'all')        return true
  if (!r.hasBoleto)       return false
  if (f === 'baixado')    return !!r.boletoDownloadedAt
  if (f === 'nao_baixado') return !r.boletoDownloadedAt
  return true
}

function matchNf(r: Row, f: NfFilter) {
  if (f === 'all')       return true
  if (!r.hasNf)          return false
  if (f === 'baixada')   return !!r.nfDownloadedAt
  if (f === 'nao_baixada') return !r.nfDownloadedAt
  return true
}

// ─── Dropdown filter component ────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value:    T
  onChange: (v: T) => void
  options:  { value: T; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors
          ${value !== 'all'
            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
            : 'bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300'
          }`}
      >
        {current?.label ?? 'Todos'}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-white/[0.08] bg-zinc-900 shadow-xl py-1">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.05]
                  ${opt.value === value ? 'text-indigo-300' : 'text-zinc-400'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Cell components ──────────────────────────────────────────────────────────

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
    <div className="space-y-1">
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
      </div>
      {portalAccess ? (
        <p className="text-[11px] text-indigo-400 flex items-center gap-1">
          <Globe size={10} />
          Último acesso: {portalAccess}
        </p>
      ) : (
        <p className="text-[11px] text-zinc-600">Nunca acessou</p>
      )}
    </div>
  )
}

function DownloadsCell({
  boletoDownloadedAt,
  nfDownloadedAt,
  hasNf,
  hasBoleto,
}: {
  boletoDownloadedAt: string | null
  nfDownloadedAt:     string | null
  hasNf:              boolean
  hasBoleto:          boolean
}) {
  if (!hasNf && !hasBoleto) {
    return <span className="text-xs text-zinc-600">—</span>
  }

  return (
    <div className="space-y-1.5">
      {hasNf && (
        <div>
          {nfDownloadedAt ? (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                <FileText size={10} />
                NF baixada
              </span>
              <p className="mt-0.5 text-[11px] text-zinc-600">{nfDownloadedAt}</p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
              <FileText size={10} />
              NF não baixada
            </span>
          )}
        </div>
      )}
      {hasBoleto && (
        <div>
          {boletoDownloadedAt ? (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                <Download size={10} />
                Boleto baixado
              </span>
              <p className="mt-0.5 text-[11px] text-zinc-600">{boletoDownloadedAt}</p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
              <Download size={10} />
              Boleto não baixado
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function RastreamentoTable({ rows }: { rows: Row[] }) {
  const [search,       setSearch]       = useState('')
  const [envioFilter,  setEnvioFilter]  = useState<EnvioFilter>('all')
  const [emailFilter,  setEmailFilter]  = useState<EmailFilter>('all')
  const [portalFilter, setPortalFilter] = useState<PortalFilter>('all')
  const [boletoFilter, setBoletoFilter] = useState<BoletoFilter>('all')
  const [nfFilter,     setNfFilter]     = useState<NfFilter>('all')

  const hasFilters = envioFilter !== 'all' || emailFilter !== 'all' || portalFilter !== 'all' || boletoFilter !== 'all' || nfFilter !== 'all'

  function clearFilters() {
    setEnvioFilter('all')
    setEmailFilter('all')
    setPortalFilter('all')
    setBoletoFilter('all')
    setNfFilter('all')
  }

  const filtered = rows.filter(r => {
    if (search && !r.clientName.toLowerCase().includes(search.toLowerCase()) && !r.clientCnpj.includes(search) && !r.campaignLabel.toLowerCase().includes(search.toLowerCase())) return false
    if (!matchEnvio(r, envioFilter))   return false
    if (!matchEmail(r, emailFilter))   return false
    if (!matchPortal(r, portalFilter)) return false
    if (!matchBoleto(r, boletoFilter)) return false
    if (!matchNf(r, nfFilter))         return false
    return true
  })

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-sm text-zinc-500">Nenhum registro encontrado.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search + clear filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente ou campanha…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={12} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                Campanha
              </th>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <Clock size={11} /> Envio
                  </span>
                  <FilterDropdown
                    value={envioFilter}
                    onChange={setEnvioFilter}
                    options={[
                      { value: 'all',        label: 'Todos'         },
                      { value: 'SENT',       label: 'Enviado'       },
                      { value: 'PENDING',    label: 'Pendente'      },
                      { value: 'FAILED',     label: 'Falhou'        },
                      { value: 'NO_EMAIL',   label: 'Sem e-mail'    },
                      { value: 'SIMULATED',  label: 'Simulado'      },
                    ]}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <MailOpen size={11} /> E-mail
                  </span>
                  <FilterDropdown
                    value={emailFilter}
                    onChange={setEmailFilter}
                    options={[
                      { value: 'all',        label: 'Todos'       },
                      { value: 'aberto',     label: 'Aberto'      },
                      { value: 'nao_aberto', label: 'Não aberto'  },
                      { value: 'nao_enviado',label: 'Não enviado' },
                    ]}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <Globe size={11} /> Portal
                  </span>
                  <FilterDropdown
                    value={portalFilter}
                    onChange={setPortalFilter}
                    options={[
                      { value: 'all',      label: 'Todos'          },
                      { value: 'acessou',  label: 'Acessou'        },
                      { value: 'nunca',    label: 'Nunca acessou'  },
                    ]}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <Download size={11} /> Downloads
                  </span>
                  <div className="flex items-center gap-1.5">
                    <FilterDropdown
                      value={boletoFilter}
                      onChange={setBoletoFilter}
                      options={[
                        { value: 'all',         label: 'Boleto: todos'        },
                        { value: 'baixado',      label: 'Boleto baixado'       },
                        { value: 'nao_baixado',  label: 'Boleto não baixado'   },
                      ]}
                    />
                    <FilterDropdown
                      value={nfFilter}
                      onChange={setNfFilter}
                      options={[
                        { value: 'all',         label: 'NF: todas'      },
                        { value: 'baixada',      label: 'NF baixada'     },
                        { value: 'nao_baixada',  label: 'NF não baixada' },
                      ]}
                    />
                  </div>
                </div>
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
                <td className="px-4 py-3">
                  <DownloadsCell
                    boletoDownloadedAt={row.boletoDownloadedAt}
                    nfDownloadedAt={row.nfDownloadedAt}
                    hasNf={row.hasNf}
                    hasBoleto={row.hasBoleto}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs text-zinc-600">
            Nenhum resultado para os filtros aplicados.
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-zinc-700 text-right">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
