'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  listContasPagarAction,
  createContaPagarAction,
  updateContaPagarAction,
  markContaPagarPaidAction,
  cancelContaPagarAction,
  deleteContaPagarAction,
} from '@/app/actions/conta-pagar'
import { getCarteirasForSelectAction } from '@/app/actions/carteira'
import { getCategoriasForSelectAction } from '@/app/actions/categoria-financeira'
import { getCentrosCustoForSelectAction } from '@/app/actions/centro-custo'
import {
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ContaPagar = Awaited<ReturnType<typeof listContasPagarAction>>[number]

interface Empresa {
  id: string
  name: string
}

interface CarteiraOption {
  id: string
  name: string
  empresa: { name: string }
}

interface CategoriaOption {
  id: string
  name: string
  type: string
  color: string
}

interface CentroCustoOption {
  id: string
  name: string
}

interface ContasPagarManagerProps {
  contas: ContaPagar[]
  empresas: Empresa[]
  carteiras: CarteiraOption[]
  initialStatus: string
  initialEmpresaId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const PAYMENT_METHODS = [
  { value: '', label: 'Selecione...' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TED', label: 'TED' },
  { value: 'DOC', label: 'DOC' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
]

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'UNICA', label: 'Única' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'ANUAL', label: 'Anual' },
]

const EMPTY_FORM = {
  title: '',
  empresa_id: '',
  carteira_id: '',
  amount: '',
  due_date: '',
  description: '',
  supplier_name: '',
  supplier_doc: '',
  categoria_id: '',
  centro_custo_id: '',
  payment_method: '',
  document_number: '',
  recurrence: '',
  recurrence_end: '',
  notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: unknown): string {
  const num = Number(value)
  return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  // Treat ISO date strings (YYYY-MM-DD) as local dates to avoid timezone shifts
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
  }
  return d.toLocaleDateString('pt-BR')
}

function isOverdue(conta: ContaPagar): boolean {
  if (conta.status !== 'PENDING') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(conta.due_date)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function getEffectiveStatus(conta: ContaPagar): string {
  if (conta.status === 'PENDING' && isOverdue(conta)) return 'OVERDUE'
  return conta.status
}

interface StatusBadgeProps { status: string }
function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700', label: 'Pendente' },
    PAID: { cls: 'bg-green-900/40 text-green-300 border-green-700', label: 'Pago' },
    OVERDUE: { cls: 'bg-red-900/40 text-red-300 border-red-700', label: 'Vencido' },
    CANCELLED: { cls: 'bg-zinc-700/60 text-zinc-400 border-zinc-600', label: 'Cancelado' },
  }
  const { cls, label } = map[status] ?? map['PENDING']
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContasPagarManager({
  contas: initial,
  empresas,
  carteiras: allCarteiras,
  initialStatus,
  initialEmpresaId,
}: ContasPagarManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters
  const [filterStatus, setFilterStatus] = useState(initialStatus)
  const [filterEmpresa, setFilterEmpresa] = useState(initialEmpresaId)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ContaPagar | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [error, setError] = useState<string | null>(null)

  // Dynamic selects
  const [carteiras, setCarteiras] = useState<CarteiraOption[]>(allCarteiras)
  const [categorias, setCategorias] = useState<CategoriaOption[]>([])
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoOption[]>([])

  // Expanded row details
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load categorias and centros on mount
  useEffect(() => {
    getCategoriasForSelectAction('DESPESA').then(setCategorias)
    getCentrosCustoForSelectAction().then(setCentrosCusto)
  }, [])

  // When empresa changes in form, reload carteiras
  useEffect(() => {
    if (!form.empresa_id) { setCarteiras(allCarteiras); return }
    getCarteirasForSelectAction(form.empresa_id).then(setCarteiras)
  }, [form.empresa_id, allCarteiras])

  // Derived filtered list
  const contas = initial.filter(c => {
    const eff = getEffectiveStatus(c)
    if (filterStatus !== 'ALL' && eff !== filterStatus) return false
    if (filterEmpresa && c.empresa_id !== filterEmpresa) return false
    return true
  })

  // Summary totals
  const totalPending = initial
    .filter(c => c.status === 'PENDING' && !isOverdue(c))
    .reduce((s, c) => s + parseFloat(String(c.amount)), 0)
  const totalPaid = initial
    .filter(c => c.status === 'PAID')
    .reduce((s, c) => s + parseFloat(String(c.amount)), 0)
  const totalOverdue = initial
    .filter(c => isOverdue(c))
    .reduce((s, c) => s + parseFloat(String(c.amount)), 0)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function applyFilters(status: string, empresaId: string) {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (empresaId) params.set('empresa_id', empresaId)
    router.push(`/financeiro/contas-pagar?${params.toString()}`)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, empresa_id: empresas[0]?.id ?? '' })
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: ContaPagar) {
    const dueDateStr = c.due_date
      ? new Date(c.due_date).toISOString().split('T')[0]
      : ''
    const recurrenceEndStr = c.recurrence_end
      ? new Date(c.recurrence_end).toISOString().split('T')[0]
      : ''
    setForm({
      title: c.title,
      empresa_id: c.empresa_id,
      carteira_id: c.carteira_id,
      amount: String(c.amount),
      due_date: dueDateStr,
      description: c.description ?? '',
      supplier_name: c.supplier_name ?? '',
      supplier_doc: c.supplier_doc ?? '',
      categoria_id: c.categoria_id ?? '',
      centro_custo_id: c.centro_custo_id ?? '',
      payment_method: c.payment_method ?? '',
      document_number: c.document_number ?? '',
      recurrence: c.recurrence ?? '',
      recurrence_end: recurrenceEndStr,
      notes: c.notes ?? '',
    })
    setEditing(c)
    setShowForm(false)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setError(null)
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createContaPagarAction(null, formData)
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleUpdate() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateContaPagarAction(editing.id, {
        title: form.title,
        empresa_id: form.empresa_id,
        carteira_id: form.carteira_id,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        description: form.description || null,
        supplier_name: form.supplier_name || null,
        supplier_doc: form.supplier_doc || null,
        categoria_id: form.categoria_id || null,
        centro_custo_id: form.centro_custo_id || null,
        payment_method: form.payment_method || null,
        document_number: form.document_number || null,
        recurrence: form.recurrence || null,
        recurrence_end: form.recurrence_end || null,
        notes: form.notes || null,
      })
      if (res?.error) { setError(res.error); return }
      closeForm()
      router.refresh()
    })
  }

  function handleMarkPaid(id: string) {
    if (!confirm('Marcar esta conta como paga?')) return
    startTransition(async () => {
      await markContaPagarPaidAction(id)
      router.refresh()
    })
  }

  function handleCancel(id: string) {
    if (!confirm('Cancelar esta conta a pagar?')) return
    startTransition(async () => {
      await cancelContaPagarAction(id)
      router.refresh()
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      await deleteContaPagarAction(id)
      router.refresh()
    })
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const inputCls =
    'w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none'
  const labelCls = 'mb-1 block text-xs text-zinc-400'
  const isFormOpen = showForm || editing !== null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/10 p-4">
          <p className="text-xs text-zinc-500">Total Pendente</p>
          <p className="mt-1 text-lg font-semibold text-yellow-300">{formatBRL(totalPending)}</p>
        </div>
        <div className="rounded-lg border border-green-800/50 bg-green-900/10 p-4">
          <p className="text-xs text-zinc-500">Total Pago</p>
          <p className="mt-1 text-lg font-semibold text-green-300">{formatBRL(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-4">
          <p className="text-xs text-zinc-500">Total Vencido</p>
          <p className="mt-1 text-lg font-semibold text-red-300">{formatBRL(totalOverdue)}</p>
        </div>
      </div>

      {/* Filter bar + create button */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); applyFilters(e.target.value, filterEmpresa) }}
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterEmpresa}
          onChange={e => { setFilterEmpresa(e.target.value); applyFilters(filterStatus, e.target.value) }}
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none"
        >
          <option value="">Todas as Empresas</option>
          {empresas.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={openCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus size={14} />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      {isFormOpen && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              {editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
            </h3>
            <button onClick={closeForm} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>

          {error && (
            <p className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <form
            action={showForm ? handleCreate : undefined}
            onSubmit={editing ? (e) => { e.preventDefault(); handleUpdate() } : undefined}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Title */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Título *</label>
              <input
                name="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className={inputCls}
                placeholder="Ex: Aluguel de outubro"
              />
            </div>

            {/* Empresa */}
            <div>
              <label className={labelCls}>Empresa *</label>
              <select
                name="empresa_id"
                value={form.empresa_id}
                onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value, carteira_id: '' }))}
                required
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Carteira */}
            <div>
              <label className={labelCls}>Carteira *</label>
              <select
                name="carteira_id"
                value={form.carteira_id}
                onChange={e => setForm(f => ({ ...f, carteira_id: e.target.value }))}
                required
                className={inputCls}
              >
                <option value="">Selecione...</option>
                {carteiras.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>Valor (R$) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
                className={inputCls}
                placeholder="0,00"
              />
            </div>

            {/* Due date */}
            <div>
              <label className={labelCls}>Vencimento *</label>
              <input
                name="due_date"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                required
                className={inputCls}
              />
            </div>

            {/* Supplier name */}
            <div>
              <label className={labelCls}>Fornecedor</label>
              <input
                name="supplier_name"
                value={form.supplier_name}
                onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                className={inputCls}
                placeholder="Nome do fornecedor"
              />
            </div>

            {/* Supplier doc */}
            <div>
              <label className={labelCls}>CNPJ / CPF do fornecedor</label>
              <input
                name="supplier_doc"
                value={form.supplier_doc}
                onChange={e => setForm(f => ({ ...f, supplier_doc: e.target.value }))}
                className={inputCls}
                placeholder="00.000.000/0001-00"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className={labelCls}>Categoria</label>
              <select
                name="categoria_id"
                value={form.categoria_id}
                onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhuma</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Centro de custo */}
            <div>
              <label className={labelCls}>Centro de Custo</label>
              <select
                name="centro_custo_id"
                value={form.centro_custo_id}
                onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhum</option>
                {centrosCusto.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payment method */}
            <div>
              <label className={labelCls}>Forma de Pagamento</label>
              <select
                name="payment_method"
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className={inputCls}
              >
                {PAYMENT_METHODS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Document number */}
            <div>
              <label className={labelCls}>Número do Documento</label>
              <input
                name="document_number"
                value={form.document_number}
                onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))}
                className={inputCls}
                placeholder="NF, boleto..."
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className={labelCls}>Recorrência</label>
              <select
                name="recurrence"
                value={form.recurrence}
                onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
                className={inputCls}
              >
                {RECURRENCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Recurrence end */}
            {form.recurrence && form.recurrence !== 'UNICA' && (
              <div>
                <label className={labelCls}>Fim da Recorrência</label>
                <input
                  name="recurrence_end"
                  type="date"
                  value={form.recurrence_end}
                  onChange={e => setForm(f => ({ ...f, recurrence_end: e.target.value }))}
                  className={inputCls}
                />
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição</label>
              <input
                name="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inputCls}
                placeholder="Opcional"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Observações</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className={inputCls}
                placeholder="Notas internas..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Check size={14} />
                {editing ? 'Salvar' : 'Criar Conta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {contas.length === 0 && !isFormOpen ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-14 text-center">
          <AlertCircle size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-400">Nenhuma conta encontrada.</p>
          <p className="mt-1 text-xs text-zinc-600">Ajuste os filtros ou crie uma nova conta.</p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-lg border border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Título</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Vencimento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Carteira</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {contas.map(conta => {
                const eff = getEffectiveStatus(conta)
                const isExpanded = expandedId === conta.id
                return (
                  <>
                    <tr key={conta.id} className="bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : conta.id)}
                          className="flex items-center gap-1 text-left text-zinc-200 hover:text-indigo-400"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span className="font-medium">{conta.title}</span>
                        </button>
                        <p className="ml-4 text-xs text-zinc-500">{conta.empresa.name}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {conta.supplier_name ?? <span className="text-zinc-600">—</span>}
                      </td>
                      <td className={`px-4 py-3 ${eff === 'OVERDUE' ? 'text-red-400' : 'text-zinc-300'}`}>
                        {formatDate(conta.due_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-200">
                        {formatBRL(conta.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={eff} />
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{conta.carteira.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(eff === 'PENDING' || eff === 'OVERDUE') && (
                            <button
                              onClick={() => handleMarkPaid(conta.id)}
                              disabled={isPending}
                              title="Marcar como pago"
                              className="rounded p-1.5 text-zinc-500 hover:bg-green-900/30 hover:text-green-400 disabled:opacity-50"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {eff !== 'CANCELLED' && eff !== 'PAID' && (
                            <button
                              onClick={() => handleCancel(conta.id)}
                              disabled={isPending}
                              title="Cancelar"
                              className="rounded p-1.5 text-zinc-500 hover:bg-yellow-900/30 hover:text-yellow-400 disabled:opacity-50"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(conta)}
                            title="Editar"
                            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(conta.id, conta.title)}
                            disabled={isPending}
                            title="Excluir"
                            className="rounded p-1.5 text-zinc-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${conta.id}-detail`} className="bg-zinc-800/20">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                            {conta.description && (
                              <div className="sm:col-span-4">
                                <span className="text-zinc-500">Descrição: </span>
                                <span className="text-zinc-300">{conta.description}</span>
                              </div>
                            )}
                            {conta.payment_method && (
                              <div>
                                <span className="text-zinc-500">Pagamento: </span>
                                <span className="text-zinc-300">{conta.payment_method}</span>
                              </div>
                            )}
                            {conta.document_number && (
                              <div>
                                <span className="text-zinc-500">Doc: </span>
                                <span className="text-zinc-300">{conta.document_number}</span>
                              </div>
                            )}
                            {conta.categoria && (
                              <div>
                                <span className="text-zinc-500">Categoria: </span>
                                <span className="text-zinc-300">{conta.categoria.name}</span>
                              </div>
                            )}
                            {conta.centro_custo && (
                              <div>
                                <span className="text-zinc-500">Centro de Custo: </span>
                                <span className="text-zinc-300">{conta.centro_custo.name}</span>
                              </div>
                            )}
                            {conta.recurrence && (
                              <div>
                                <span className="text-zinc-500">Recorrência: </span>
                                <span className="text-zinc-300">{conta.recurrence}</span>
                              </div>
                            )}
                            {conta.paid_at && (
                              <div>
                                <span className="text-zinc-500">Pago em: </span>
                                <span className="text-zinc-300">{formatDate(conta.paid_at)}</span>
                              </div>
                            )}
                            {conta.paid_amount != null && (
                              <div>
                                <span className="text-zinc-500">Valor pago: </span>
                                <span className="text-zinc-300">{formatBRL(conta.paid_amount)}</span>
                              </div>
                            )}
                            {conta.notes && (
                              <div className="sm:col-span-4">
                                <span className="text-zinc-500">Obs: </span>
                                <span className="text-zinc-300">{conta.notes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
