'use client'

import { useActionState } from 'react'
import type { Organization } from '@prisma/client'
import { SubscriptionBadge } from '../../_components/SubscriptionBadge'

type State = { error?: string; success?: string } | null

const STATUSES = [
  { value: 'TRIAL',     label: 'Trial' },
  { value: 'ACTIVE',    label: 'Ativo' },
  { value: 'OVERDUE',   label: 'Inadimplente' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

function toDateInput(date: Date | null | undefined) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

interface Props {
  org: Organization
  action: (prevState: State, formData: FormData) => Promise<State>
}

export function AssinaturaTab({ org, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Status atual:</span>
        <SubscriptionBadge status={org.subscription_status} />
      </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Status da assinatura</label>
            <select name="subscription_status" defaultValue={org.subscription_status}
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:ring-0 focus:outline-none">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Fim do trial</label>
            <input name="trial_ends_at" type="date" defaultValue={toDateInput(org.trial_ends_at)}
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:ring-0 focus:outline-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Vencimento da assinatura</label>
            <input name="subscription_ends_at" type="date" defaultValue={toDateInput(org.subscription_ends_at)}
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 focus:border-white/20 focus:ring-0 focus:outline-none" />
          </div>
        </div>

        <button type="submit" disabled={isPending}
          className="rounded-md bg-white/[0.06] border border-white/[0.08] px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50 transition-colors">
          {isPending ? 'Salvando...' : 'Atualizar assinatura'}
        </button>
      </form>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Resumo</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-400">Plano</dt>
            <dd className="text-zinc-100 capitalize">{org.plan}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">Cliente desde</dt>
            <dd className="text-zinc-100">{new Date(org.created_at).toLocaleDateString('pt-BR')}</dd>
          </div>
          {org.trial_ends_at && (
            <div className="flex justify-between">
              <dt className="text-zinc-400">Trial até</dt>
              <dd className="text-zinc-100">{new Date(org.trial_ends_at).toLocaleDateString('pt-BR')}</dd>
            </div>
          )}
          {org.subscription_ends_at && (
            <div className="flex justify-between">
              <dt className="text-zinc-400">Assinatura vence</dt>
              <dd className={`font-medium ${new Date(org.subscription_ends_at) < new Date() ? 'text-red-400' : 'text-zinc-100'}`}>
                {new Date(org.subscription_ends_at).toLocaleDateString('pt-BR')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
