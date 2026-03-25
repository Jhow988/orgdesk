'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, RotateCcw, Mail, FileText, Eye } from 'lucide-react'
import {
  saveEmailTemplateAction,
  deleteEmailTemplateAction,
} from '@/app/actions/email-templates'
import {
  DEFAULT_SUBJECT,
  DEFAULT_BODY,
  type EmailTemplateRow,
} from '@/app/actions/email-templates-defaults'

// ─── Preview ─────────────────────────────────────────────────────────────────

const PREVIEW_VARS = {
  nome_cliente: 'Cliente Exemplo',
  mes_ano:      '03/2026',
  link_portal:  '#',
}

function applyVars(text: string) {
  return text
    .replace(/\{nome_cliente\}/g, PREVIEW_VARS.nome_cliente)
    .replace(/\{mes_ano\}/g,      PREVIEW_VARS.mes_ano)
    .replace(/\{link_portal\}/g,  PREVIEW_VARS.link_portal)
}

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  const renderedSubject = applyVars(subject)
  const renderedBody    = applyVars(body)

  const paragraphs = renderedBody.split(/\n\n+/).map((block, i) => {
    const lines = block.replace(/\n/g, '<br />')
    return <p key={i} className="mb-3 text-sm text-zinc-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: lines }} />
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Email header mock */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 space-y-1.5 text-xs">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-zinc-500 w-14">Assunto:</span>
          <span className="font-semibold text-zinc-800">{renderedSubject || '—'}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-zinc-500 w-14">De:</span>
          <span className="text-indigo-600">financeiro@syall.com.br</span>
          <span className="text-zinc-400 mx-1">Para:</span>
          <span className="text-indigo-600">financeiro@cliente.com.br</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-500 w-14">Anexo:</span>
          <span className="inline-flex items-center gap-1 text-zinc-600">
            <FileText size={11} />
            NF_00000000000000_202603.pdf
          </span>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto bg-white p-5 pb-10">
        {/* Header bar */}
        <div className="mb-4 rounded-t-lg bg-[#1a2e4a] px-5 py-3">
          <p className="text-white font-bold text-base">Syall Soluções</p>
          <p className="text-[#93adc8] text-xs">Departamento Financeiro — Syall Soluções &lt;financeiro@syall.com.br&gt;</p>
        </div>
        <div className="px-1">
          {paragraphs}
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 text-center">
          Este e-mail foi gerado automaticamente pelo sistema OrgDesk.
        </div>
      </div>
    </div>
  )
}

// ─── Editor ──────────────────────────────────────────────────────────────────

const VARS = ['{nome_cliente}', '{mes_ano}', '{link_portal}']

function TemplateEditor({
  template,
  onSaved,
  onDeleted,
}: {
  template: EmailTemplateRow | null  // null = new template
  onSaved:  (t: EmailTemplateRow) => void
  onDeleted?: () => void
}) {
  const [name,    setName]    = useState(template?.name    ?? '')
  const [subject, setSubject] = useState(template?.subject ?? DEFAULT_SUBJECT)
  const [body,    setBody]    = useState(template?.body    ?? DEFAULT_BODY)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,   setError]   = useState('')

  function insertVar(v: string) {
    setBody(prev => prev + v)
  }

  function handleRestore() {
    if (!confirm('Restaurar o conteúdo padrão? O assunto e corpo serão substituídos.')) return
    setSubject(DEFAULT_SUBJECT)
    setBody(DEFAULT_BODY)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await saveEmailTemplateAction(template?.id ?? null, name, subject, body)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved({ id: res.id!, name, subject, body })
  }

  async function handleDelete() {
    if (!template?.id) return
    if (!confirm(`Excluir o template "${template.name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    await deleteEmailTemplateAction(template.id)
    setDeleting(false)
    onDeleted?.()
  }

  return (
    <div className="grid grid-cols-2 gap-0 h-full min-h-0">
      {/* ── Left: Editor ── */}
      <div className="flex flex-col min-h-0 border-r border-white/[0.08]">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <FileText size={11} /> Editor
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
            >
              <RotateCcw size={11} /> Restaurar padrão
            </button>
            {template?.id && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-md border border-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={11} /> Excluir
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Save size={11} /> {saving ? 'Salvando…' : 'Salvar template'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Nome do Template
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: NF e Boleto, Reajuste, Comunicado…"
              disabled={!!template?.id}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            {template?.id && (
              <p className="mt-1 text-[11px] text-zinc-600">O nome não pode ser alterado após criação.</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Assunto
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Corpo do E-mail
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={18}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:border-white/20 focus:outline-none resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* Variables */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Variáveis</p>
            <div className="flex flex-wrap gap-2">
              {VARS.map(v => (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-mono text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">
              Clique em uma variável para inserir no cursor, ou digite diretamente no corpo.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: Preview ── */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1.5 border-b border-white/[0.08] px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            <Eye size={11} /> Preview
          </div>
          <span className="ml-auto text-[10px] text-zinc-700">Atualiza em tempo real</span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-zinc-100 rounded-br-xl">
          <EmailPreview subject={subject} body={body} />
        </div>
      </div>
    </div>
  )
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export function EmailTemplatesManager({ templates: initial }: { templates: EmailTemplateRow[] }) {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>(initial)
  const [selected,  setSelected]  = useState<string | 'new' | null>(
    initial.length > 0 ? initial[0].id : 'new'
  )

  const selectedTemplate = selected === 'new' ? null : (templates.find(t => t.id === selected) ?? null)

  function handleSaved(t: EmailTemplateRow) {
    setTemplates(prev => {
      const idx = prev.findIndex(x => x.id === t.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = t; return next
      }
      return [...prev, t]
    })
    setSelected(t.id)
  }

  function handleDeleted() {
    if (!selected || selected === 'new') return
    setTemplates(prev => prev.filter(t => t.id !== selected))
    setSelected(templates.length > 1 ? templates.find(t => t.id !== selected)!.id : 'new')
  }

  return (
    <div className="flex h-[calc(100vh-160px)] rounded-xl border border-white/[0.08] overflow-hidden">
      {/* ── Sidebar: template list ── */}
      <div className="w-56 flex-shrink-0 border-r border-white/[0.08] bg-white/[0.02] flex flex-col">
        <div className="p-3 border-b border-white/[0.08]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Templates</p>
          <button
            onClick={() => setSelected('new')}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
              selected === 'new'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Plus size={13} /> Novo template
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                selected === t.id
                  ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/25'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Mail size={13} className="flex-shrink-0" />
              <span className="text-xs truncate">{t.name}</span>
            </button>
          ))}
          {templates.length === 0 && (
            <p className="px-3 py-4 text-[11px] text-zinc-600 text-center">
              Nenhum template criado.
            </p>
          )}
        </div>
      </div>

      {/* ── Main: editor + preview ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TemplateEditor
          key={selected ?? 'new'}
          template={selectedTemplate}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  )
}
