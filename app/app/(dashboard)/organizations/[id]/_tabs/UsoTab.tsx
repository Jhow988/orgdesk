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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Última atividade</p>
          <p className="mt-2 text-sm font-medium text-white">
            {stats.lastActivity
              ? new Date(stats.lastActivity).toLocaleString('pt-BR')
              : <span className="text-zinc-500">Nenhuma atividade registrada</span>}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-3">Boletos por status</p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-zinc-500">Pendentes </span>
            <span className="font-medium text-white">{stats.boletos.pending}</span>
          </div>
          <div>
            <span className="text-zinc-500">Pagos </span>
            <span className="font-medium text-emerald-400">{stats.boletos.paid}</span>
          </div>
          <div>
            <span className="text-zinc-500">Vencidos </span>
            <span className="font-medium text-red-400">{stats.boletos.overdue}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
