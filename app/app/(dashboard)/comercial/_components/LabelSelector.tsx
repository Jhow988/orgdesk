'use client'

import { useState } from 'react'
import { Tag, X, ChevronDown } from 'lucide-react'
import { setProposalLabelsAction, setContractLabelsAction } from '@/app/actions/labels'

interface Label {
  id: string
  name: string
  color: string
}

function LabelBadge({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}
    >
      {label.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 hover:opacity-70">
          <X size={10} />
        </button>
      )}
    </span>
  )
}

export { LabelBadge }

export function LabelSelector({
  entityType,
  entityId,
  allLabels,
  currentLabels,
}: {
  entityType: 'proposal' | 'contract'
  entityId: string
  allLabels: Label[]
  currentLabels: Label[]
}) {
  const [selected, setSelected] = useState<Label[]>(currentLabels)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const available = allLabels.filter(l => !selected.find(s => s.id === l.id))

  async function add(label: Label) {
    const next = [...selected, label]
    setSelected(next)
    setOpen(false)
    setSaving(true)
    const ids = next.map(l => l.id)
    if (entityType === 'proposal') await setProposalLabelsAction(entityId, ids)
    else await setContractLabelsAction(entityId, ids)
    setSaving(false)
  }

  async function remove(labelId: string) {
    const next = selected.filter(l => l.id !== labelId)
    setSelected(next)
    setSaving(true)
    const ids = next.map(l => l.id)
    if (entityType === 'proposal') await setProposalLabelsAction(entityId, ids)
    else await setContractLabelsAction(entityId, ids)
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag size={13} className="text-zinc-500 flex-shrink-0" />
        {selected.length === 0 && (
          <span className="text-xs text-zinc-600">Sem etiquetas</span>
        )}
        {selected.map(l => (
          <LabelBadge key={l.id} label={l} onRemove={() => remove(l.id)} />
        ))}
        {saving && <span className="text-[10px] text-zinc-600 animate-pulse">salvando…</span>}
      </div>

      {available.length > 0 && (
        <div className="relative inline-block">
          <button type="button" onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/20 transition-colors">
            <Tag size={11} /> Adicionar etiqueta <ChevronDown size={10} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 z-20 min-w-44 rounded-lg border border-white/[0.1] bg-zinc-900 shadow-xl py-1">
              {available.map(l => (
                <button key={l.id} type="button" onClick={() => add(l)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.05] transition-colors text-left">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-zinc-300">{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
