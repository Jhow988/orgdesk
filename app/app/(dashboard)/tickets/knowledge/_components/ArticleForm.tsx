'use client'

import { useActionState } from 'react'

interface Props {
  action: (prev: unknown, formData: FormData) => Promise<any>
  defaultValues?: {
    id?: string
    title?: string
    content?: string
    category?: string
    visibility?: string
    status?: string
  }
}

export function ArticleForm({ action, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  const inp = 'w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none'
  const lbl = 'block mb-1 text-xs font-medium text-zinc-400'
  const sel = `${inp} cursor-pointer bg-zinc-900`

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {(state as any)?.error && (
        <p className="rounded-md border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {(state as any).error}
        </p>
      )}

      <div>
        <label className={lbl}>Título *</label>
        <input name="title" required defaultValue={defaultValues?.title}
          placeholder="Ex: Como configurar o sistema de chamados…"
          className={inp} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={lbl}>Categoria</label>
          <input name="category" defaultValue={defaultValues?.category ?? ''}
            placeholder="Ex: Tutorial, FAQ, Manual…"
            className={inp} />
        </div>
        <div>
          <label className={lbl}>Visibilidade</label>
          <select name="visibility" defaultValue={defaultValues?.visibility ?? 'PUBLIC'} className={sel}>
            <option value="PUBLIC">Público (clientes + equipe)</option>
            <option value="INTERNAL">Interno (somente equipe)</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? 'DRAFT'} className={sel}>
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Conteúdo *</label>
        <p className="text-xs text-zinc-600 mb-1.5">Suporta formatação em texto simples. Use linhas em branco para separar parágrafos.</p>
        <textarea name="content" required rows={18} defaultValue={defaultValues?.content}
          placeholder="Escreva o conteúdo do artigo aqui…"
          className={`${inp} resize-y font-mono text-xs leading-relaxed`} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={isPending}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
          {isPending ? 'Salvando…' : defaultValues?.id ? 'Salvar alterações' : 'Criar artigo'}
        </button>
        <a href="/tickets/knowledge"
          className="rounded-md border border-white/[0.1] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Cancelar
        </a>
      </div>
    </form>
  )
}
