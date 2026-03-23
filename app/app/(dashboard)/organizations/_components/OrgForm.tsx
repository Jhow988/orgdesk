'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

type State = { error?: string; success?: string } | null

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface OrgFormProps {
  action: (prevState: State, formData: FormData) => Promise<State>
  defaultValues?: {
    name?: string
    slug?: string
    cnpj?: string
    plan?: string
    is_active?: boolean
  }
  isEdit?: boolean
}

export function OrgForm({ action, defaultValues, isEdit }: OrgFormProps) {
  const [state, formAction, isPending] = useActionState(action, null)
  const slugRef = useRef<HTMLInputElement>(null)
  const autoSlug = useRef(true)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit && autoSlug.current && slugRef.current) {
      slugRef.current.value = slugify(e.target.value)
    }
  }

  function handleSlugChange() {
    autoSlug.current = false
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">
          {state.success}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Nome da organização *</label>
          <input
            name="name"
            required
            defaultValue={defaultValues?.name}
            onChange={handleNameChange}
            placeholder="Acme Ltda"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Slug *</label>
          <input
            name="slug"
            required
            ref={slugRef}
            defaultValue={defaultValues?.slug}
            onChange={handleSlugChange}
            placeholder="acme"
            readOnly={isEdit}
            className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none ${isEdit ? 'cursor-not-allowed opacity-60' : ''}`}
          />
          {!isEdit && <p className="text-xs text-zinc-600">Usado na URL: slug.orgdesk.com.br</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">CNPJ</label>
          <input
            name="cnpj"
            defaultValue={defaultValues?.cnpj ?? ''}
            placeholder="00.000.000/0000-00"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">Plano</label>
          <select
            name="plan"
            defaultValue={defaultValues?.plan ?? 'free'}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            {PLANS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Status</label>
            <select
              name="is_active"
              defaultValue={defaultValues?.is_active ? '1' : '0'}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
            >
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar organização'}
        </button>
        <Link href="/organizations" className="text-sm text-zinc-500 hover:text-white transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
