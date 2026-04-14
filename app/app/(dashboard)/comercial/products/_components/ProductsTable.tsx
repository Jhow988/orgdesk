'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { toggleProductAction } from '@/app/actions/products'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

interface Product {
  id: string
  name: string
  description: string | null
  type: string
  unit: string | null
  price: any
  is_active: boolean
}

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState<'ALL' | 'SERVICE' | 'PRODUCT'>('ALL')
  const [statusFilter, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false
      if (statusFilter === 'ACTIVE' && !p.is_active) return false
      if (statusFilter === 'INACTIVE' && p.is_active) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [products, search, typeFilter, statusFilter])

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleProductAction(id, isActive)
      router.refresh()
    })
  }

  const filterBtn = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15]'
    }`

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="shrink-0 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar nome ou descrição…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          <button onClick={() => setType('ALL')}     className={filterBtn(typeFilter === 'ALL')}>Todos</button>
          <button onClick={() => setType('SERVICE')} className={filterBtn(typeFilter === 'SERVICE')}>Serviços</button>
          <button onClick={() => setType('PRODUCT')} className={filterBtn(typeFilter === 'PRODUCT')}>Produtos</button>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <button onClick={() => setStatus('ALL')}      className={filterBtn(statusFilter === 'ALL')}>Todos</button>
          <button onClick={() => setStatus('ACTIVE')}   className={filterBtn(statusFilter === 'ACTIVE')}>Ativos</button>
          <button onClick={() => setStatus('INACTIVE')} className={filterBtn(statusFilter === 'INACTIVE')}>Inativos</button>
        </div>

        <span className="ml-auto text-xs text-zinc-600">
          {filtered.length} de {products.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <table className="w-full text-sm bg-transparent">
          <thead>
            <tr className="border-b border-white/[0.08] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Preço padrão</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  {search || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Nenhum item encontrado para os filtros aplicados.'
                    : 'Nenhum produto ou serviço cadastrado.'}
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-100">{p.name}</div>
                  {p.description && <div className="text-xs text-zinc-500 truncate max-w-xs">{p.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.type === 'SERVICE' ? 'bg-blue-900/50 text-blue-400' : 'bg-violet-900/50 text-violet-400'
                  }`}>
                    {p.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.unit}</td>
                <td className="px-4 py-3 text-zinc-300 font-mono">
                  {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-white/[0.08] text-zinc-500'
                  }`}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/comercial/products/${p.id}`} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                      Editar
                    </Link>
                    <button
                      onClick={() => handleToggle(p.id, p.is_active)}
                      disabled={isPending}
                      className={`text-xs transition-colors disabled:opacity-50 ${
                        p.is_active ? 'text-red-500 hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'
                      }`}
                    >
                      {p.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
