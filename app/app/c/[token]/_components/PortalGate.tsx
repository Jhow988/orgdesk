'use client'

import { useState } from 'react'
import {
  FileText, Download, LogIn, Globe, MessageSquare,
  Plus, X, ChevronLeft, Send, Clock, CheckCircle2,
  CircleDot, RefreshCw, AlertCircle, BookOpen,
} from 'lucide-react'
import {
  verifyPortalAccessAction,
  createPortalTicketAction,
  addPortalMessageAction,
  type PortalData,
  type PortalTicket,
} from '@/app/actions/portal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCnpjInput(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN:           { label: 'Aberto',             color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   icon: <CircleDot   size={11} /> },
  IN_PROGRESS:    { label: 'Em andamento',       color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <RefreshCw   size={11} /> },
  WAITING_CLIENT: { label: 'Aguardando resposta',color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: <Clock       size={11} /> },
  RESOLVED:       { label: 'Resolvido',          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 size={11} /> },
  CLOSED:         { label: 'Fechado',            color: 'text-zinc-500  bg-zinc-700/40   border-zinc-700',       icon: <X           size={11} /> },
}

// ─── Login form ───────────────────────────────────────────────────────────────

function VerifyForm({ token, onSuccess }: { token: string; onSuccess: (d: PortalData) => void }) {
  const [email,   setEmail]   = useState('')
  const [cnpj,    setCnpj]    = useState('')
  const [error,   setError]   = useState('')
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
          <p className="mt-1 text-sm text-zinc-500">Informe seu e-mail e CNPJ para acessar seus documentos.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="financeiro@suaempresa.com.br"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-medium text-zinc-400">CNPJ</label>
            <input type="text" required inputMode="numeric" value={cnpj}
              onChange={e => setCnpj(formatCnpjInput(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-colors font-mono" />
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            <LogIn size={15} />
            {loading ? 'Verificando…' : 'Acessar documentos'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Financeiro tab ───────────────────────────────────────────────────────────

function DocumentsList({ data, token }: { data: PortalData; token: string }) {
  return (
    <div>
      {data.sends.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum documento disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.sends.map(send => (
            <div key={send.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{send.campaignLabel}</p>
                {send.sent_at && <p className="mt-0.5 text-xs text-zinc-600">Enviado em {send.sent_at}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {send.nf_pages.length > 0 && (
                  <a href={`/api/c/${token}/pdf?campaignId=${send.campaignId}&type=nf`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                    <FileText size={12} />
                    NFS ({send.nf_pages.length} pág.)
                    <Download size={11} className="ml-0.5 opacity-60" />
                  </a>
                )}
                {send.boleto_pages.length > 0 && (
                  <a href={`/api/c/${token}/pdf?campaignId=${send.campaignId}&type=boleto`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors">
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

// ─── Suporte tab ──────────────────────────────────────────────────────────────

function NewTicketForm({
  token, clientId,
  onCreated, onCancel,
}: {
  token: string; clientId: string
  onCreated: (t: PortalTicket) => void
  onCancel:  () => void
}) {
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [category, setCategory] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await createPortalTicketAction(token, clientId, title, body, category)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    // Return a minimal ticket object so UI updates immediately
    onCreated({
      id: res.ticketId!,
      number: 0,
      title: title.trim(),
      category: category.trim() || null,
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: 'agora',
      updatedAt: 'agora',
      messages: [{ id: '', body: body.trim(), authorType: 'client', createdAt: 'agora' }],
    })
  }

  return (
    <div>
      <button onClick={onCancel}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft size={13} /> Voltar
      </button>
      <h3 className="text-base font-semibold text-zinc-100 mb-4">Abrir novo chamado</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-xs font-medium text-zinc-400">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="Resumo do problema…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1.5 text-xs font-medium text-zinc-400">Categoria (opcional)</label>
          <input value={category} onChange={e => setCategory(e.target.value)}
            placeholder="ex: Financeiro, Técnico…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1.5 text-xs font-medium text-zinc-400">Descrição</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5}
            placeholder="Descreva o problema em detalhes…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none resize-none" />
        </div>
        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            <Send size={13} />
            {loading ? 'Enviando…' : 'Enviar chamado'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TicketView({
  ticket, token, clientId,
  onBack, onReply,
}: {
  ticket:   PortalTicket
  token:    string
  clientId: string
  onBack:   () => void
  onReply:  (msg: { id: string; body: string; authorType: string; createdAt: string }) => void
}) {
  const [reply,   setReply]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const sc = STATUS_CFG[ticket.status] ?? STATUS_CFG.OPEN

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setError('')
    setLoading(true)
    const res = await addPortalMessageAction(token, clientId, ticket.id, reply)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onReply({ id: Date.now().toString(), body: reply.trim(), authorType: 'client', createdAt: 'agora' })
    setReply('')
  }

  return (
    <div>
      <button onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft size={13} /> Voltar aos chamados
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-zinc-600 font-mono mb-1">#{ticket.number}</p>
          <h3 className="text-base font-semibold text-zinc-100">{ticket.title}</h3>
          {ticket.category && <p className="text-xs text-zinc-500 mt-0.5">{ticket.category}</p>}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${sc.color}`}>
          {sc.icon} {sc.label}
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-6">
        {ticket.messages.map(m => (
          <div key={m.id}
            className={`rounded-xl border px-4 py-3 ${
              m.authorType === 'client'
                ? 'bg-indigo-500/5 border-indigo-500/20 ml-6'
                : 'bg-zinc-900 border-zinc-800'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${m.authorType === 'client' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                {m.authorType === 'client' ? 'Você' : 'Suporte'}
              </span>
              <span className="text-[11px] text-zinc-600">{m.createdAt}</span>
            </div>
            <p className="text-sm text-zinc-200 whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>

      {/* Reply */}
      {ticket.status !== 'CLOSED' && (
        <form onSubmit={handleReply} className="space-y-2">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
            placeholder="Escreva sua resposta…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none resize-none" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={loading || !reply.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              <Send size={13} />
              {loading ? 'Enviando…' : 'Responder'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function TicketsList({
  tickets, token, clientId,
  onNewTicket,
}: {
  tickets:     PortalTicket[]
  token:       string
  clientId:    string
  onNewTicket: () => void
}) {
  const [selected, setSelected]   = useState<PortalTicket | null>(null)
  const [list,     setList]       = useState<PortalTicket[]>(tickets)

  function handleCreated(t: PortalTicket) {
    setList(prev => [t, ...prev])
    setSelected(t)
  }

  function handleReply(ticketId: string, msg: { id: string; body: string; authorType: string; createdAt: string }) {
    setList(prev => prev.map(t =>
      t.id === ticketId ? { ...t, messages: [...t.messages, msg], status: t.status === 'RESOLVED' || t.status === 'WAITING_CLIENT' ? 'OPEN' : t.status } : t
    ))
    if (selected?.id === ticketId) {
      setSelected(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
    }
  }

  if (selected) {
    // Check if this is a new ticket (number === 0, show without reply initially)
    const current = list.find(t => t.id === selected.id) ?? selected
    return (
      <TicketView
        ticket={current}
        token={token}
        clientId={clientId}
        onBack={() => setSelected(null)}
        onReply={msg => handleReply(current.id, msg)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">{list.length} chamado{list.length !== 1 ? 's' : ''}</p>
        <button onClick={onNewTicket}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors">
          <Plus size={13} /> Abrir chamado
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <AlertCircle size={20} className="mx-auto mb-2 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum chamado aberto.</p>
          <p className="text-xs text-zinc-700 mt-1">Clique em "Abrir chamado" para falar com o suporte.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(t => {
            const sc = STATUS_CFG[t.status] ?? STATUS_CFG.OPEN
            return (
              <button key={t.id} onClick={() => setSelected(t)}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-600 font-mono">#{t.number}</p>
                    <p className="text-sm font-medium text-zinc-100 truncate">{t.title}</p>
                    {t.category && <p className="text-xs text-zinc-500">{t.category}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${sc.color}`}>
                    {sc.icon} {sc.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-1.5">
                  {t.messages.length} mensagem{t.messages.length !== 1 ? 's' : ''} · atualizado {t.updatedAt}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Knowledge base tab ───────────────────────────────────────────────────────

function KnowledgeBase({ data }: { data: PortalData }) {
  const [selected, setSelected] = useState<PortalData['articles'][number] | null>(null)

  const grouped: Record<string, PortalData['articles']> = {}
  for (const a of data.articles) {
    const cat = a.category ?? 'Geral'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(a)
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronLeft size={13} /> Voltar
        </button>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          {selected.category && (
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{selected.category}</p>
          )}
          <h3 className="text-base font-semibold text-zinc-100 mb-1">{selected.title}</h3>
          <p className="text-xs text-zinc-600 mb-5">Atualizado em {selected.updatedAt}</p>
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            {selected.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{para}</p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (data.articles.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <BookOpen size={20} className="mx-auto mb-2 text-zinc-700" />
        <p className="text-sm text-zinc-500">Nenhum artigo disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">{cat}</p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
            {items.map(a => (
              <button key={a.id} onClick={() => setSelected(a)}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen size={14} className="text-zinc-600 flex-shrink-0" />
                  <span className="text-sm text-zinc-200 truncate">{a.title}</span>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">{a.updatedAt}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Authenticated portal ─────────────────────────────────────────────────────

type Tab = 'financeiro' | 'suporte' | 'conhecimento'

function AuthenticatedPortal({ data, token }: { data: PortalData; token: string }) {
  const [tab,        setTab]        = useState<Tab>('financeiro')
  const [newTicket,  setNewTicket]  = useState(false)
  const [tickets,    setTickets]    = useState<PortalTicket[]>(data.tickets)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">{data.clientName}</h1>
        <p className="mt-1 text-sm text-zinc-500">CNPJ {data.clientCnpj}</p>
      </div>

      {/* Sidebar nav */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-0">
        <button
          onClick={() => setTab('financeiro')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'financeiro'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText size={14} />
          Financeiro
        </button>
        <button
          onClick={() => { setTab('suporte'); setNewTicket(false) }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'suporte'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquare size={14} />
          Suporte
          {tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length > 0 && (
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
              {tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('conhecimento')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'conhecimento'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen size={14} />
          Base de Conhecimento
          {data.articles.length > 0 && (
            <span className="rounded-full bg-zinc-700/50 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
              {data.articles.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'financeiro' && <DocumentsList data={data} token={token} />}

      {tab === 'suporte' && (
        newTicket ? (
          <NewTicketForm
            token={token}
            clientId={data.clientId}
            onCancel={() => setNewTicket(false)}
            onCreated={t => {
              setTickets(prev => [t, ...prev])
              setNewTicket(false)
            }}
          />
        ) : (
          <TicketsList
            tickets={tickets}
            token={token}
            clientId={data.clientId}
            onNewTicket={() => setNewTicket(true)}
          />
        )
      )}

      {tab === 'conhecimento' && <KnowledgeBase data={data} />}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function PortalGate({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null)

  if (data) return <AuthenticatedPortal data={data} token={token} />
  return <VerifyForm token={token} onSuccess={setData} />
}
