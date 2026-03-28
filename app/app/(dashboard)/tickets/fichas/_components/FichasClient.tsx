'use client'

import { useState } from 'react'
import {
  Search, Eye, Pencil, Trash2, X, Copy, Check,
  Monitor, Wifi, Package, Users, FileText, Save, Info, Clock,
} from 'lucide-react'
import {
  getTechSheetAction, saveTechSheetAction, deleteTechSheetAction,
  type TechSheet, type ClientWithSheet,
} from '@/app/actions/tech-sheets'

function fmtCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}


const TOOL_COLORS: Record<string, string> = {
  AnyDesk:    'bg-green-500/15 text-green-400 border border-green-500/20',
  TeamViewer: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  RDP:        'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  VPN:        'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Outro:      'bg-zinc-700/40 text-zinc-400 border border-zinc-700',
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  if (!text?.trim()) return null
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
      className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
      {ok ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

function Field({ label, value, secret }: { label: string; value?: string; secret?: boolean }) {
  const [show, setShow] = useState(false)
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-sm text-zinc-300 ${secret && !show ? 'blur-sm select-none' : ''}`}>{value}</span>
        {secret && (
          <button type="button" onClick={() => setShow(s => !s)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
            <Eye size={12} />
          </button>
        )}
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

type Tab = 'access' | 'software' | 'contacts' | 'extra'

function SheetModal({
  client,
  onClose,
  onDeleted,
}: {
  client:    ClientWithSheet
  onClose:   () => void
  onDeleted: () => void
}) {
  const [tab,     setTab]     = useState<Tab>('access')
  const [sheet,   setSheet]   = useState<TechSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState<Partial<TechSheet>>({})
  const [saving,   setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  // load on mount
  useState(() => {
    getTechSheetAction(client.id).then(s => { setSheet(s); setForm(s); setLoading(false) })
  })

  function set(key: keyof TechSheet, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function save() {
    setSaving(true)
    await saveTechSheetAction(client.id, form)
    setSaving(false); setEditing(false)
    const updated = await getTechSheetAction(client.id)
    setSheet(updated); setForm(updated)
  }

  async function handleDelete() {
    if (!confirm(`Excluir ficha técnica de "${client.name}"?`)) return
    setDeleting(true)
    await deleteTechSheetAction(client.id)
    onDeleted()
  }

  const inp = 'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-700 focus:border-indigo-500/40 focus:outline-none'
  const ta  = inp + ' resize-none'
  const lbl = 'block mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600'

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'access',   label: 'Rede e Acesso',      icon: Monitor  },
    { id: 'software', label: 'Hardware / Software', icon: Package  },
    { id: 'contacts', label: 'Contatos',            icon: Users    },
    { id: 'extra',    label: 'Informações Extras',  icon: Info     },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.01] rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{client.name}</h3>
            <p className="text-xs text-zinc-600">Ficha Técnica Completa · {fmtCnpj(client.cnpj)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] bg-white/[0.01]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2
                ${tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-zinc-600 animate-pulse py-8 text-center">Carregando…</p>
          ) : !sheet ? null : editing ? (

            /* ── EDIT MODE ── */
            tab === 'access' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-indigo-500/20 pb-2 flex items-center gap-2"><Monitor size={13} /> Acesso Remoto</h4>
                  <div>
                    <label className={lbl}>Ferramenta</label>
                    <select value={form.remoteTool ?? ''} onChange={e => set('remoteTool', e.target.value)} className={inp}>
                      <option value="">— selecione —</option>
                      {['AnyDesk','TeamViewer','RDP','VPN','Outro'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>ID / Endereço</label><input value={form.remoteId ?? ''} onChange={e => set('remoteId', e.target.value)} className={inp} placeholder="455 211 900" /></div>
                  <div><label className={lbl}>Senha padrão</label><input value={form.remotePassword ?? ''} onChange={e => set('remotePassword', e.target.value)} className={inp} placeholder="senha123" /></div>
                  <div><label className={lbl}>Observações (VPN, porta, etc)</label><textarea rows={3} value={form.remoteNotes ?? ''} onChange={e => set('remoteNotes', e.target.value)} className={ta} placeholder="Host VPN, chave privada…" /></div>
                </section>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-violet-500/20 pb-2 flex items-center gap-2"><Wifi size={13} /> Configuração de Rede</h4>
                  <div><label className={lbl}>Gateway padrão</label><input value={form.gateway ?? ''} onChange={e => set('gateway', e.target.value)} className={inp} placeholder="192.168.1.1" /></div>
                  <div><label className={lbl}>DNS Primário</label><input value={form.dnsPrimary ?? ''} onChange={e => set('dnsPrimary', e.target.value)} className={inp} placeholder="8.8.8.8" /></div>
                  <div><label className={lbl}>Faixa DHCP</label><input value={form.dhcpRange ?? ''} onChange={e => set('dhcpRange', e.target.value)} className={inp} placeholder="192.168.1.100 – 192.168.1.250" /></div>
                  <div><label className={lbl}>Observações de rede</label><textarea rows={3} value={form.networkNotes ?? ''} onChange={e => set('networkNotes', e.target.value)} className={ta} placeholder="MikroTik na sala do rack…" /></div>
                </section>
              </div>
            ) : tab === 'software' ? (
              <section className="space-y-4 max-w-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-2"><Package size={13} /> Hardware / Software / Servidores</h4>
                <textarea rows={12} value={form.softwareNotes ?? ''} onChange={e => set('softwareNotes', e.target.value)} className={ta} placeholder={"Servidor AD: Windows Server 2019 — 192.168.1.10\nERP: Totvs v12 — porta 1433\nBackup: nuvem 22:00h\nAntivírus: Kaspersky\nImpressoras: …"} />
                <div><label className={lbl}>Anotações gerais</label><textarea rows={4} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} className={ta} placeholder="Observações diversas…" /></div>
              </section>
            ) : tab === 'contacts' ? (
              <section className="space-y-4 max-w-lg">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-amber-500/20 pb-2 flex items-center gap-2"><Users size={13} /> Contato Principal</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Nome</label><input value={form.contactName ?? ''} onChange={e => set('contactName', e.target.value)} className={inp} placeholder="Carlos Silva" /></div>
                  <div><label className={lbl}>Função</label><input value={form.contactRole ?? ''} onChange={e => set('contactRole', e.target.value)} className={inp} placeholder="TI Interno" /></div>
                  <div><label className={lbl}>Telefone</label><input value={form.contactPhone ?? ''} onChange={e => set('contactPhone', e.target.value)} className={inp} placeholder="(11) 99999-9999" /></div>
                  <div><label className={lbl}>E-mail</label><input value={form.contactEmail ?? ''} onChange={e => set('contactEmail', e.target.value)} className={inp} placeholder="ti@empresa.com.br" /></div>
                </div>
              </section>
            ) : (
              <section className="space-y-4 max-w-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-sky-500/20 pb-2 flex items-center gap-2"><Info size={13} /> Informações Adicionais</h4>
                <textarea rows={10} value={form.additionalInfo ?? ''} onChange={e => set('additionalInfo', e.target.value)} className={ta} placeholder={"Licenças especiais, contratos, senhas de roteador, observações de infraestrutura…"} />
              </section>
            )

          ) : (

            /* ── VIEW MODE ── */
            tab === 'access' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-indigo-500/20 pb-2 flex items-center gap-2"><Monitor size={13} /> Acesso Remoto</h4>
                  {(sheet.remoteTool || sheet.remoteId || sheet.remotePassword || sheet.remoteNotes) ? (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                      {sheet.remoteTool && (
                        <div>
                          <p className={lbl}>Ferramenta</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${TOOL_COLORS[sheet.remoteTool] ?? TOOL_COLORS.Outro}`}>{sheet.remoteTool}</span>
                        </div>
                      )}
                      <Field label="ID / Endereço" value={sheet.remoteId} />
                      <Field label="Senha padrão" value={sheet.remotePassword} secret />
                      {sheet.remoteNotes && <div><p className={lbl}>Observações</p><p className="text-sm text-zinc-400 whitespace-pre-wrap">{sheet.remoteNotes}</p></div>}
                    </div>
                  ) : <p className="text-xs text-zinc-700">Nenhuma informação cadastrada.</p>}
                </section>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 border-b border-violet-500/20 pb-2 flex items-center gap-2"><Wifi size={13} /> Configuração de Rede</h4>
                  {(sheet.gateway || sheet.dnsPrimary || sheet.dhcpRange || sheet.networkNotes) ? (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 text-sm">
                      {sheet.gateway    && <div className="flex justify-between border-b border-white/[0.04] pb-2"><span className="text-zinc-600">Gateway Padrão</span><span className="font-mono text-zinc-300 font-bold">{sheet.gateway}</span></div>}
                      {sheet.dnsPrimary && <div className="flex justify-between border-b border-white/[0.04] pb-2"><span className="text-zinc-600">DNS Primário</span><span className="font-mono text-zinc-300">{sheet.dnsPrimary}</span></div>}
                      {sheet.dhcpRange  && <div className="flex justify-between border-b border-white/[0.04] pb-2"><span className="text-zinc-600">Faixa DHCP</span><span className="font-mono text-zinc-400 text-xs">{sheet.dhcpRange}</span></div>}
                      {sheet.networkNotes && <div><p className={lbl}>Observações</p><p className="text-xs text-zinc-500 italic">{sheet.networkNotes}</p></div>}
                    </div>
                  ) : <p className="text-xs text-zinc-700">Nenhuma informação cadastrada.</p>}
                </section>
              </div>
            ) : tab === 'software' ? (
              <section className="max-w-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-2"><Package size={13} /> Hardware / Software / Servidores</h4>
                {sheet.softwareNotes
                  ? <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">{sheet.softwareNotes}</pre>
                  : <p className="text-xs text-zinc-700">Nenhuma informação cadastrada.</p>}
                {sheet.notes && <><h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] pb-2 flex items-center gap-2 mt-6"><FileText size={13} /> Anotações Gerais</h4><p className="text-sm text-zinc-400 whitespace-pre-wrap">{sheet.notes}</p></>}
              </section>
            ) : tab === 'contacts' ? (
              <section className="max-w-lg space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-amber-500/20 pb-2 flex items-center gap-2"><Users size={13} /> Contato Principal</h4>
                {(sheet.contactName || sheet.contactPhone || sheet.contactEmail) ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    {sheet.contactName && <div><p className={lbl}>Nome</p><p className="text-sm font-medium text-zinc-200">{sheet.contactName}{sheet.contactRole && <span className="ml-2 text-xs text-zinc-600">· {sheet.contactRole}</span>}</p></div>}
                    <Field label="Telefone" value={sheet.contactPhone} />
                    <Field label="E-mail"   value={sheet.contactEmail} />
                  </div>
                ) : <p className="text-xs text-zinc-700">Nenhum contato cadastrado.</p>}
              </section>
            ) : (
              <div className="max-w-2xl space-y-6">
                <section className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-sky-500/20 pb-2 flex items-center gap-2"><Info size={13} /> Informações Adicionais</h4>
                  {sheet.additionalInfo
                    ? <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">{sheet.additionalInfo}</p>
                    : <p className="text-xs text-zinc-700">Nenhuma informação adicional cadastrada.</p>}
                </section>
                <section className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] pb-2 flex items-center gap-2"><Clock size={13} /> Histórico de Alterações</h4>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Criado em</span>
                      <span className="text-zinc-400">{new Date(sheet.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/[0.04] pt-2">
                      <span className="text-zinc-600">Última alteração</span>
                      <span className="text-zinc-400">{new Date(sheet.updatedAt).toLocaleString('pt-BR')}</span>
                    </div>
                    {sheet.updatedByName && (
                      <div className="flex justify-between border-t border-white/[0.04] pt-2">
                        <span className="text-zinc-600">Alterado por</span>
                        <span className="text-zinc-300 font-medium">{sheet.updatedByName}</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-white/[0.01] rounded-b-2xl">
          <button onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
            <Trash2 size={12} /> {deleting ? 'Excluindo…' : 'Excluir Ficha'}
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setForm(sheet ?? {}) }}
                  className="rounded-lg border border-white/[0.08] px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose}
                  className="rounded-lg border border-white/[0.08] px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  Fechar
                </button>
                <button onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                  <Pencil size={13} /> Editar Informações
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function FichasClient({ clients: initial }: { clients: ClientWithSheet[] }) {
  const [clients,   setClients]   = useState(initial)
  const [search,    setSearch]    = useState('')
  const [gwFilter,  setGwFilter]  = useState('')
  const [selected,  setSelected]  = useState<ClientWithSheet | null>(null)

  const q  = search.trim().toLowerCase()
  const gw = gwFilter.trim().toLowerCase()
  const filtered = clients.filter(c => {
    if (q  && !c.name.toLowerCase().includes(q) && !c.cnpj.replace(/\D/g,'').includes(q.replace(/\D/g,''))) return false
    if (gw && !(c.gateway ?? '').toLowerCase().includes(gw)) return false
    return true
  })

  function handleDeleted() {
    setSelected(null)
    setClients(cs => cs.map(c => c.id === selected?.id ? { ...c, hasSheet: false, remoteTool: null, remoteId: null, gateway: null, contactName: null, contactRole: null } : c))
  }

  function handleClose() {
    // refresh the row summary
    if (selected) {
      getTechSheetAction(selected.id).then(s => {
        setClients(cs => cs.map(c => c.id === s.clientId
          ? { ...c, hasSheet: true, remoteTool: s.remoteTool || null, remoteId: s.remoteId || null, gateway: s.gateway || null, contactName: s.contactName || null, contactRole: s.contactRole || null }
          : c
        ))
      }).catch(() => {})
    }
    setSelected(null)
  }

  return (
    <>
      {selected && (
        <SheetModal client={selected} onClose={handleClose} onDeleted={handleDeleted} />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou CNPJ…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
        </div>
        <div className="relative w-52">
          <Wifi size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input value={gwFilter} onChange={e => setGwFilter(e.target.value)}
            placeholder="IP do Gateway…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Acesso Principal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Rede Local</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Responsável</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-200">{c.name}</p>
                  <p className="text-[11px] text-zinc-600 font-mono">{fmtCnpj(c.cnpj)}</p>
                </td>
                <td className="px-4 py-3">
                  {c.remoteTool || c.remoteId ? (
                    <div className="flex items-center gap-2">
                      {c.remoteTool && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${TOOL_COLORS[c.remoteTool] ?? TOOL_COLORS.Outro}`}>{c.remoteTool}</span>
                      )}
                      {c.remoteId && <span className="font-mono text-xs text-zinc-400">{c.remoteId}</span>}
                    </div>
                  ) : <span className="text-xs text-zinc-700">—</span>}
                </td>
                <td className="px-4 py-3">
                  {c.gateway
                    ? <span className="text-xs text-zinc-400 font-mono">GW: {c.gateway}</span>
                    : <span className="text-xs text-zinc-700">—</span>}
                </td>
                <td className="px-4 py-3">
                  {c.contactName ? (
                    <div>
                      <p className="text-xs font-medium text-zinc-300">{c.contactName}</p>
                      {c.contactRole && <p className="text-[11px] text-zinc-600">{c.contactRole}</p>}
                    </div>
                  ) : <span className="text-xs text-zinc-700">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); setSelected(c) }}
                      className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors" title="Ver ficha">
                      <Eye size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelected(c) }}
                      className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                  {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum resultado para esse filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-zinc-700 text-right">
        {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        {' · '}
        {clients.filter(c => c.hasSheet).length} com ficha
      </p>
    </>
  )
}
