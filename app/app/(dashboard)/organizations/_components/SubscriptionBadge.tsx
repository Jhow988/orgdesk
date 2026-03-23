const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  TRIAL:     { label: 'Trial',       className: 'bg-blue-900/50 text-blue-400' },
  ACTIVE:    { label: 'Ativo',       className: 'bg-emerald-900/50 text-emerald-400' },
  OVERDUE:   { label: 'Inadimplente',className: 'bg-red-900/50 text-red-400' },
  SUSPENDED: { label: 'Suspenso',    className: 'bg-yellow-900/50 text-yellow-400' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-zinc-800 text-zinc-500' },
}

export function SubscriptionBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.TRIAL
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
