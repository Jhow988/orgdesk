'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Building2, Phone, Mail, Lock, MessageCircle,
  RefreshCw, CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react'
import {
  addTicketReplyAction,
  updateTicketStatusAction,
  updateTicketPriorityAction,
  assignTicketAction,
} from '@/app/actions/tickets'

type Status   = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED'
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface Message {
  id:         string
  body:       string
  isInternal: boolean
  isAuto:     boolean
  authorName: string
  authorType: string
  createdAt:  string
}

interface Ticket {
  id:         string
  number:     number
  title:      string
  status:     Status
  priority:   Priority
  category:   string | null
  resolvedAt: string | null
  closedAt:   string | null
  createdAt:  string
  updatedAt:  string
  client: {
    id:    string
    name:  string
    cnpj:  string
    email: string
    phone: string
  }
  assignee:   { id: string; name: string } | null
  messages:   Message[]
  orgMembers: { id: string; name: string }[]
}

const STATUS_CFG: Record<Status, { label: string; dot: string; badge: string }> = {
  OPEN:           { label: 'Aberto',             dot: 'bg-blue-400',    badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  IN_PROGRESS:    { label: 'Em andamento',       dot: 'bg-yellow-400',  badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  WAITING_CLIENT: { label: 'Aguard. cliente',    dot: 'bg-violet-400',  badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  RESOLVED:       { label: 'Resolvido',          dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  CLOSED:         { label: 'Fechado',            dot: 'bg-zinc-500',    badge: 'bg-zinc-700/40 border-zinc-700 text-zinc-500' },
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  LOW:      { label: 'Baixa',   color: 'text-zinc-400' },
  MEDIUM:   { label: 'Média',   color: 'text-amber-400' },
  HIGH:     { label: 'Alta',    color: 'text-orange-400' },
  CRITICAL: { label: 'Crítica', color: 'text-red-400' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div
      className={`h-${size} w-${size} rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-xs font-semibold text-indigo-300">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isInternal = msg.isInternal

  return (
    <div className={`flex gap-3 ${isInternal ? 'opacity-80' : ''}`}>
      <Avatar name={msg.authorName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-200">{msg.authorName}</span>
          {isInternal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
              <Lock size={8} /> Interno
            </span>
          )}
          <span className="text-[11px] text-zinc-600">{fmtDate(msg.createdAt)}</span>
        </div>
        <div
          className={`rounded-xl px-4 py-3 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed border
            ${isInternal
              ? 'bg-amber-500/5 border-amber-500/10'
              : 'bg-white/[0.03] border-white/[0.06]'
            }`}
        >
          {msg.body}
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function TicketDetail({ ticket: initial }: { ticket: Ticket }) {
  const router   = useRouter()
  const [pending, startTransition] = useTransition()

  const [ticket,     setTicket]     = useState(initial)
  const [reply,      setReply]      = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [replyError, setReplyError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket.messages])

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateTicketStatusAction(ticket.id, status)
      setTicket(t => ({ ...t, status: status as Status }))
    })
  }

  function handlePriorityChange(priority: string) {
    startTransition(async () => {
      await updateTicketPriorityAction(ticket.id, priority)
      setTicket(t => ({ ...t, priority: priority as Priority }))
    })
  }

  function handleAssigneeChange(userId: string) {
    startTransition(async () => {
      await assignTicketAction(ticket.id, userId || null)
      const member = ticket.orgMembers.find(m => m.id === userId)
      setTicket(t => ({ ...t, assignee: member ? { id: member.id, name: member.name } : null }))
    })
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setReplyError('')

    const body = reply.trim()
    const internal = isInternal

    startTransition(async () => {
      try {
        await addTicketReplyAction(ticket.id, body, internal)
        setTicket(t => ({
          ...t,
          messages: [
            ...t.messages,
            {
              id:         Math.random().toString(),
              body,
              isInternal: internal,
              isAuto:     false,
              authorName: 'Você',
              authorType: 'user',
              createdAt:  new Date().toISOString(),
            },
          ],
          status: t.status === 'WAITING_CLIENT' && !internal ? 'IN_PROGRESS' : t.status,
        }))
        setReply('')
        setIsInternal(false)
      } catch (err: any) {
        setReplyError(err?.message ?? 'Erro ao enviar resposta')
      }
    })
  }

  const sc = STATUS_CFG[ticket.status]   ?? STATUS_CFG.OPEN
  const pc = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.MEDIUM
  const isClosed = ticket.status === 'CLOSED'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start gap-4">
        <button
          onClick={() => router.push('/tickets')}
          className="mt-0.5 rounded-md p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-zinc-600">#{ticket.number}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
            {ticket.category && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
                {ticket.category}
              </span>
            )}
          </div>
          <h1 className="text-lg font-semibold text-zinc-100">{ticket.title}</h1>
          <p className="text-xs text-zinc-600 mt-0.5">Aberto em {fmtDate(ticket.createdAt)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex gap-0 overflow-hidden px-6 pb-6">

        {/* Thread + Reply */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-5">
            {ticket.messages.map(m => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          {!isClosed && (
            <form onSubmit={handleReply} className="rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={4}
                placeholder={isInternal ? 'Nota interna (não visível ao cliente)…' : 'Escreva sua resposta…'}
                className={`w-full rounded-t-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 bg-transparent focus:outline-none resize-none ${
                  isInternal ? 'placeholder-amber-700' : ''
                }`}
              />
              <div className={`flex items-center justify-between px-3 py-2 border-t ${
                isInternal ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06]'
              }`}>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={e => setIsInternal(e.target.checked)}
                    className="rounded border-zinc-600 accent-amber-500"
                  />
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Lock size={10} /> Nota interna
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={pending || !reply.trim()}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50
                    ${isInternal
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                >
                  <MessageCircle size={13} />
                  {pending ? 'Enviando…' : isInternal ? 'Salvar nota' : 'Responder'}
                </button>
              </div>
              {replyError && (
                <p className="px-4 pb-2 text-xs text-red-400">{replyError}</p>
              )}
            </form>
          )}
          {isClosed && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-600 text-center">
              Este chamado está fechado.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 ml-6 space-y-4">
          {/* Client */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Cliente</p>
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Building2 size={14} className="text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{ticket.client.name}</p>
                <p className="text-[11px] text-zinc-600 font-mono">{fmtCnpj(ticket.client.cnpj)}</p>
              </div>
            </div>
            {ticket.client.email && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Mail size={11} className="flex-shrink-0" />
                <span className="truncate">{ticket.client.email}</span>
              </div>
            )}
            {ticket.client.phone && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Phone size={11} className="flex-shrink-0" />
                <span>{ticket.client.phone}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Configurações</p>

            <div>
              <label className="block mb-1.5 text-xs text-zinc-500">Status</label>
              <select
                value={ticket.status}
                onChange={e => handleStatusChange(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="WAITING_CLIENT">Aguardando cliente</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-xs text-zinc-500">Prioridade</label>
              <select
                value={ticket.priority}
                onChange={e => handlePriorityChange(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-xs text-zinc-500">Responsável</label>
              <select
                value={ticket.assignee?.id ?? ''}
                onChange={e => handleAssigneeChange(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="">— Sem responsável —</option>
                {ticket.orgMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Ações rápidas</p>
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={pending || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'}
              className="w-full inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors"
            >
              <CheckCircle2 size={12} /> Marcar como resolvido
            </button>
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={pending || ticket.status === 'CLOSED'}
              className="w-full inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            >
              <XCircle size={12} /> Fechar chamado
            </button>
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={pending || ticket.status === 'IN_PROGRESS'}
              className="w-full inline-flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-30 transition-colors"
            >
              <RefreshCw size={12} /> Em andamento
            </button>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Informações</p>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">Criado</span>
              <span className="text-zinc-400">{fmtDate(ticket.createdAt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">Atualizado</span>
              <span className="text-zinc-400">{fmtDate(ticket.updatedAt)}</span>
            </div>
            {ticket.resolvedAt && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Resolvido</span>
                <span className="text-emerald-400">{fmtDate(ticket.resolvedAt)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-zinc-600">Mensagens</span>
              <span className="text-zinc-400">{ticket.messages.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
