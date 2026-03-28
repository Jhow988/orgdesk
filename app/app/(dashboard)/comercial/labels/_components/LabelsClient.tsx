'use client'

import { useState, useActionState } from 'react'
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react'
import { createLabelAction, updateLabelAction, deleteLabelAction } from '@/app/actions/labels'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#a1a1aa',
]

interface Label {
  id: string
  name: string
  color: string
  description: string | null
}

function LabelBadge({ label }: { label: Label }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      {label.name}
    </span>
  )
}

function LabelForm({
  label,
  onDone,
}: {
  label?: Label
  onDone: () => void
}) {
  const action = label ? updateLabelAction : createLabelAction
  const [state, formAction, isPending] = useActionState(action, null)
  const [color, setColor] = useState(label?.color ?? '#6366f1')

  return (
    <form action={async (fd) => {
      const result = await formAction(fd)
      if ((result as any)?.ok) onDone()
    }} className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      {label && <input type="hidden" name="id" value={label.id} />}

      {(state as any)?.error && (
        <p className="text-sm text-red-400">{(state as any).error}</p>
      )}

      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-400">Nome *</label>
        <input name="name" required defaultValue={label?.name}
          placeholder="Ex: Cliente VIP, Urgente, Renovação…"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-400">Descrição</label>
        <input name="description" defaultValue={label?.description ?? ''}
          placeholder="Para que serve essa etiqueta…"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
      </div>

      <div>
        <label className="block mb-2 text-xs font-medium text-zinc-400">Cor</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-zinc-500">Pré-visualização:</span>
          <LabelBadge label={{ id: '', name: 'Exemplo', color, description: null }} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {isPending ? 'Salvando…' : label ? 'Salvar alterações' : 'Criar etiqueta'}
        </button>
        <button type="button" onClick={onDone}
          className="rounded-md border border-white/[0.1] px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function LabelsClient({ labels: initial, isAdmin }: { labels: Label[]; isAdmin: boolean }) {
  const [labels, setLabels] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta etiqueta? Ela será removida de todas as propostas e contratos.')) return
    setDeleting(id)
    await deleteLabelAction(id)
    setLabels(ls => ls.filter(l => l.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {isAdmin && !creating && (
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
          <Plus size={15} /> Nova etiqueta
        </button>
      )}

      {creating && isAdmin && (
        <LabelForm onDone={() => { setCreating(false); window.location.reload() }} />
      )}

      {labels.length === 0 && !creating && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center">
          <Tag size={24} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhuma etiqueta criada ainda.</p>
          {isAdmin && <p className="text-xs text-zinc-700 mt-1">Clique em "Nova etiqueta" para começar.</p>}
        </div>
      )}

      <div className="space-y-2">
        {labels.map(label => (
          <div key={label.id}>
            {editing === label.id && isAdmin ? (
              <LabelForm label={label} onDone={() => { setEditing(null); window.location.reload() }} />
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <LabelBadge label={label} />
                    </div>
                    {label.description && (
                      <p className="text-xs text-zinc-600 mt-0.5">{label.description}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(label.id)}
                      className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(label.id)} disabled={deleting === label.id}
                      className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
