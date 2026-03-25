'use client'

import { useState, useMemo } from 'react'
import { Activity, Search, Filter } from 'lucide-react'
import { ACTION_LABELS, ACTION_COLOR, ENTITY_LABELS } from '@/lib/activity-labels'
import type { ActivityEntry } from '@/app/actions/activity'

interface Props {
  entries: ActivityEntry[]
}

const ALL = '__all__'

export function ActivityClient({ entries }: Props) {
  const [search,       setSearch]       = useState('')
  const [entityFilter, setEntityFilter] = useState(ALL)

  // Unique entity types present in this dataset
  const entityTypes = useMemo(() => {
    const set = new Set(entries.map(e => e.entity).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (entityFilter !== ALL && e.entity !== entityFilter) return false
      if (!q) return true
      const label   = ACTION_LABELS[e.action] ?? e.action
      const user    = e.user_name ?? e.user_email ?? ''
      const payload = JSON.stringify(e.payload ?? {}).toLowerCase()
      return label.toLowerCase().includes(q) || user.toLowerCase().includes(q) || payload.includes(q)
    })
  }, [entries, search, entityFilter])

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Histórico de Atividades</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registro de todas as alterações realizadas no sistema.
          </p>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-400">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <Search size={13} className="flex-shrink-0 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ação, usuário ou detalhe…"
            className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <Filter size={13} className="text-zinc-500" />
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="bg-transparent text-sm text-zinc-300 focus:outline-none"
          >
            <option value={ALL}>Todos os módulos</option>
            {entityTypes.map(t => (
              <option key={t} value={t}>{ENTITY_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Activity size={28} className="mb-3 text-zinc-700" />
            <p className="text-sm">Nenhuma atividade encontrada.</p>
            {entries.length === 0 && (
              <p className="mt-1 text-xs text-zinc-600">As atividades aparecerão aqui conforme o sistema for utilizado.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                <th className="px-5 py-3">Data / Hora</th>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Ação</th>
                <th className="px-5 py-3">Módulo</th>
                <th className="px-5 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const label   = ACTION_LABELS[e.action] ?? e.action
                const color   = ACTION_COLOR[e.action]  ?? 'text-zinc-400'
                const entity  = e.entity ? (ENTITY_LABELS[e.entity] ?? e.entity) : '—'
                const details = formatPayload(e.payload)
                const date    = new Date(e.created_at)

                return (
                  <tr
                    key={e.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Data / Hora */}
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-400">
                      <span className="block">
                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      <span className="text-zinc-600">
                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>

                    {/* Usuário */}
                    <td className="px-5 py-3">
                      {e.user_name ? (
                        <div>
                          <p className="text-[13px] font-medium text-zinc-200">{e.user_name}</p>
                          <p className="text-[11px] text-zinc-500">{e.user_email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">Sistema</span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="px-5 py-3">
                      <span className={`text-[13px] font-medium ${color}`}>{label}</span>
                    </td>

                    {/* Módulo */}
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-zinc-400">
                        {entity}
                      </span>
                    </td>

                    {/* Detalhes */}
                    <td className="px-5 py-3 text-[11px] text-zinc-500 max-w-xs truncate">
                      {details}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function formatPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return '—'
  const parts: string[] = []
  const labels: Record<string, string> = {
    name:      'Nome',
    email:     'E-mail',
    role:      'Perfil',
    title:     'Título',
    number:    'Nº',
    status:    'Status',
    label:     'Período',
    is_active: 'Ativo',
  }
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue
    const key = labels[k] ?? k
    parts.push(`${key}: ${v}`)
  }
  return parts.join(' · ') || '—'
}
