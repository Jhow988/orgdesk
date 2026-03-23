interface Stats {
  clients: number
  boletos: { total: number; paid: number; overdue: number; pending: number }
  tickets: { total: number; open: number; resolved: number }
  invoices: number
  campaigns: number
  lastActivity: Date | null
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

export function UsoTab({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes" value={stats.clients} />
        <StatCard
          label="Boletos"
          value={stats.boletos.total}
          sub={`${stats.boletos.paid} pagos · ${stats.boletos.overdue} vencidos`}
        />
        <StatCard
          label="Chamados"
          value={stats.tickets.total}
          sub={`${stats.tickets.open} abertos · ${stats.tickets.resolved} resolvidos`}
        />
        <StatCard label="Notas Fiscais" value={stats.invoices} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Campanhas" value={stats.campaigns} />
        <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Última atividade</p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {stats.lastActivity
              ? new Date(stats.lastActivity).toLocaleString('pt-BR')
              : <span className="text-zinc-400">Nenhuma atividade registrada</span>}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Boletos por status</p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-zinc-400">Pendentes </span>
            <span className="font-medium text-zinc-900">{stats.boletos.pending}</span>
          </div>
          <div>
            <span className="text-zinc-400">Pagos </span>
            <span className="font-medium text-emerald-400">{stats.boletos.paid}</span>
          </div>
          <div>
            <span className="text-zinc-400">Vencidos </span>
            <span className="font-medium text-red-400">{stats.boletos.overdue}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
