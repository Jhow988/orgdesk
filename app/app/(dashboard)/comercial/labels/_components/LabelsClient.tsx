'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
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
  onDone: (saved?: Label) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState(label?.color ?? '#6366f1')
  const [name, setName] = useState(label?.name ?? '')
  const [description, setDescription] = useState(label?.description ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = label
        ? await updateLabelAction(null, fd) as any
        : await createLabelAction(null, fd) as any
      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        onDone(result.label)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {label && <input type="hidden" name="id" value={label.id} />}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-400">Nome *</label>
        <input name="name" required value={name} onChange={e => setName(e.target.value)}
          placeholder="Ex: Cliente VIP, Urgente, Renovação…"
          className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none" />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-400">Descrição</label>
        <input name="description" value={description} onChange={e => setDescription(e.target.value)}
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
          <LabelBadge label={{ id: '', name: name || 'Exemplo', color, description: null }} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {isPending ? 'Salvando…' : label ? 'Salvar alterações' : 'Criar etiqueta'}
        </button>
        <button type="button" onClick={() => onDone()}
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

  function handleCreated(created?: Label) {
    if (created) setLabels(ls => [...ls, created])
    setCreating(false)
  }

  function handleUpdated(updated?: Label) {
    if (updated) setLabels(ls => ls.map(l => l.id === updated.id ? updated : l))
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta etiqueta? Ela será removida de todas as propostas e contratos.')) return
    setDeleting(id)
    await deleteLabelAction(id)
    setLabels(ls => ls.filter(l => l.id !== id))
    setDeleting(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* LEFT — form / create button */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {creating ? 'Nova etiqueta' : editing ? 'Editar etiqueta' : 'Etiquetas'}
          </h2>
          {isAdmin && !creating && !editing && (
            <button onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors">
              <Plus size={13} /> Nova etiqueta
            </button>
          )}
        </div>

        {creating && isAdmin && (
          <LabelForm onDone={handleCreated} />
        )}

        {editing && isAdmin && (() => {
          const lbl = labels.find(l => l.id === editing)
          return lbl ? <LabelForm label={lbl} onDone={handleUpdated} /> : null
        })()}

        {!creating && !editing && (
          <p className="text-sm text-zinc-500">
            Clique em <span className="text-zinc-300 font-medium">Nova etiqueta</span> para criar uma etiqueta e aplicar em propostas e contratos.
          </p>
        )}
      </div>

      {/* RIGHT — labels list */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200">Etiquetas criadas</h2>
          <span className="text-xs text-zinc-500">
            {labels.length === 0 ? 'Nenhuma' : `${labels.length} etiqueta${labels.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {labels.length === 0 ? (
          <div className="py-8 text-center">
            <Tag size={22} className="mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">Nenhuma etiqueta criada ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.map(label => (
              <div key={label.id}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <div className="min-w-0">
                    <LabelBadge label={label} />
                    {label.description && (
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{label.description}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => { setCreating(false); setEditing(label.id) }}
                      className="p-1.5 rounded text-zinc-600 hover:text-indigo-400 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(label.id)} disabled={deleting === label.id}
                      className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
