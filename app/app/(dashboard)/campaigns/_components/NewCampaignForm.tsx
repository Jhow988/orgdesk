'use client'

import { useActionState, useRef, useState } from 'react'
import { Upload, X, FileText, RotateCcw } from 'lucide-react'
import type { CampaignState } from '@/app/actions/campaigns'

interface Props {
  action: (prev: CampaignState, data: FormData) => Promise<CampaignState>
}

function DropZone({
  name,
  label,
  required,
  accept = '.pdf',
}: {
  name: string
  label: string
  required?: boolean
  accept?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label} {required && <span className="text-indigo-400">* (obrigatório)</span>}
        {!required && <span className="text-zinc-600">(opcional)</span>}
      </p>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : file
            ? 'border-emerald-700 bg-emerald-950/20'
            : 'border-white/[0.1] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-300">{file.name}</span>
            <span className="text-xs text-zinc-500">({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={18} className="text-zinc-500" />
            <p className="text-sm text-zinc-500">
              Clique ou arraste o {label}
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="hidden"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

export function NewCampaignForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <span className="text-indigo-400">+</span> Nova Campanha
      </p>

      {state?.error && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Mês / Ano <span className="text-indigo-400">*</span>
          </label>
          <input
            type="month"
            name="month_year"
            required
            className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:outline-none"
          />
        </div>

        <DropZone name="pdf_nf"     label="PDF de NFs"     required />
        <DropZone name="pdf_boleto" label="PDF de Boletos" />

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            💾 {isPending ? 'Salvando...' : 'Salvar Campanha'}
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.reset()}
            className="flex items-center gap-2 rounded-md border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
          >
            <RotateCcw size={13} /> Limpar
          </button>
        </div>
      </form>
    </div>
  )
}
