'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Monitor, Wifi, Package, Users, FileText, Save, Copy, Check, ChevronRight } from 'lucide-react'
import { getTechSheetAction, saveTechSheetAction, type TechSheet } from '@/app/actions/tech-sheets'

interface ClientRow {
  id:             string
  name:           string
  cnpj:           string
  hasSheet:       boolean
  sheetUpdatedAt: string | null
}

function fmtCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const SECTIONS = [
  { key: 'remoteAccess', label: 'Acesso Remoto',  icon: Monitor,   placeholder: 'AnyDesk ID, TeamViewer, chaves VPN, portas de conexão…' },
  { key: 'network',      label: 'Rede',           icon: Wifi,      placeholder: 'Gateway, faixa de IPs, DNS, login do roteador/firewall…' },
  { key: 'software',     label: 'Software',       icon: Package,   placeholder: 'Sistemas utilizados, versões, chaves de licença, horários de backup…' },
  { key: 'contacts',     label: 'Contatos Chave', icon: Users,     placeholder: 'Responsável de TI, dono da empresa, telefones, e-mails…' },
  { key: 'notes',        label: 'Anotações',      icon: FileText,  placeholder: 'Observações gerais, equipamentos especiais, anotações diversas…' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  if (!text.trim()) return null
  return (
    <button type="button" onClick={copy}
      className="rounded p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
      title="Copiar">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

export function FichasClient({ clients }: { clients: ClientRow[] }) {
  const [search,         setSearch]         = useState('')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [sheet,          setSheet]          = useState<TechSheet | null>(null)
  const [form,           setForm]           = useState<Record<SectionKey, string>>({
    remoteAccess: '', network: '', software: '', contacts: '', notes: '',
  })
  const [loading,        setLoading]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [dirty,          setDirty]          = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      )
    : clients

  async function selectClient(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    setLoading(true)
    setDirty(false)
    setSaved(false)
    try {
      const data = await getTechSheetAction(id)
      setSheet(data)
      setForm({
        remoteAccess: data.remoteAccess,
        network:      data.network,
        software:     data.software,
        contacts:     data.contacts,
        notes:        data.notes,
      })
    } finally {
      setLoading(false)
    }
  }

  function handleChange(key: SectionKey, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  async function handleSave() {
    if (!selectedId || !dirty) return
    setSaving(true)
    try {
      await saveTechSheetAction(selectedId, form)
      setSaved(true)
      setDirty(false)
      // update hasSheet in local list
    } finally {
      setSaving(false)
    }
  }

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!dirty || !selectedId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => { handleSave() }, 2000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [form, dirty, selectedId])

  const selected = selectedId ? clients.find(c => c.id === selectedId) : null

  return (
    <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">

      {/* Left — client list */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-white/[0.07] divide-y divide-white/[0.04]">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-xs text-zinc-600 text-center">Nenhum cliente encontrado</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectClient(c.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]
                ${selectedId === c.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{c.name}</p>
                <p className="text-[11px] text-zinc-600 font-mono">{fmtCnpj(c.cnpj)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {c.hasSheet && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Tem ficha" />
                )}
                <ChevronRight size={12} className="text-zinc-700" />
              </div>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-zinc-700 text-right">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          {' · '}
          {clients.filter(c => c.hasSheet).length} com ficha
        </p>
      </div>

      {/* Right — sheet editor */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-3 text-zinc-800" />
              <p className="text-sm text-zinc-600">Selecione um cliente para ver ou editar a ficha técnica</p>
            </div>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-600 animate-pulse">Carregando ficha…</p>
          </div>
        ) : sheet ? (
          <div className="space-y-4 pb-6">
            {/* Sheet header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">{selected?.name}</h2>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{fmtCnpj(selected?.cnpj ?? '')}</p>
                {sheet.updatedAt && (
                  <p className="text-[11px] text-zinc-700 mt-0.5">Atualizado em {fmtDate(sheet.updatedAt)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40
                  ${saved && !dirty
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500'
                  }`}
              >
                {saved && !dirty
                  ? <><Check size={12} /> Salvo</>
                  : <><Save size={12} /> {saving ? 'Salvando…' : 'Salvar'}</>
                }
              </button>
            </div>

            {/* Sections */}
            {SECTIONS.map(sec => (
              <div key={sec.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <sec.icon size={13} className="text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{sec.label}</span>
                  </div>
                  <CopyButton text={form[sec.key]} />
                </div>
                <textarea
                  value={form[sec.key]}
                  onChange={e => handleChange(sec.key, e.target.value)}
                  rows={5}
                  placeholder={sec.placeholder}
                  className="w-full bg-transparent px-4 py-3 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed font-mono"
                />
              </div>
            ))}

            {/* Auto-save hint */}
            <p className="text-[11px] text-zinc-700 text-right">
              {dirty ? 'Salvamento automático em 2s…' : 'Todas as alterações salvas'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
