'use client'

import { useActionState, useRef, useState } from 'react'
import { Upload, X, FileText, RotateCcw, Plus, Loader2 } from 'lucide-react'
import type { CampaignState } from '@/app/actions/campaigns'

interface Props {
  action: (prev: CampaignState, data: FormData) => Promise<CampaignState>
}

function FileButton({
  name,
  label,
  required,
}: {
  name: string
  label: string
  required?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label} {required ? <span className="text-indigo-400">*</span> : <span className="text-zinc-700">opt.</span>}
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
          file
            ? 'border-emerald-700/60 bg-emerald-950/20'
            : 'border-white/[0.1] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
        }`}
      >
        {file ? (
          <>
            <FileText size={13} className="shrink-0 text-emerald-400" />
            <span className="truncate text-xs text-emerald-300">{file.name}</span>
            <span className="shrink-0 text-[10px] text-zinc-500">{(file.size / 1024).toFixed(0)}KB</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="ml-auto shrink-0 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <Upload size={13} className="shrink-0 text-zinc-500" />
            <span className="text-xs text-zinc-500">Selecionar PDF</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept=".pdf"
        required={required}
        className="hidden"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

export function NewCampaignForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400"
      >
        <Plus size={14} /> Nova Campanha
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
      {state?.error && (
        <div className="mb-3 rounded-md border border-red-800 bg-red-950/50 px-3 py-1.5 text-xs text-red-400">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Mês / Ano <span className="text-indigo-400">*</span>
            </p>
            <input
              type="month"
              name="month_year"
              required
              className="rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>

          <FileButton name="pdf_nf" label="PDF de NFs" required />
          <FileButton name="pdf_boleto" label="PDF de Boletos" />

          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => { formRef.current?.reset(); setOpen(false) }}
              className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
            >
              <RotateCcw size={11} /> Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
