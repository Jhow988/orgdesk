'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  roles?: string[]
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Geral',
    defaultOpen: true,
    items: [
      { href: '/dashboard',    label: 'Visão Geral' },
      { href: '/organizations', label: 'Organizações', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Financeiro',
    defaultOpen: true,
    items: [
      { href: '/boletos',               label: 'Boletos' },
      { href: '/financeiro/pix',        label: 'PIX' },
      { href: '/invoices',              label: 'Notas Fiscais' },
      { href: '/campaigns',             label: 'Campanhas' },
      { href: '/financeiro/relatorios', label: 'Relatórios' },
    ],
  },
  {
    label: 'Chamados',
    defaultOpen: true,
    items: [
      { href: '/tickets',            label: 'Chamados' },
      { href: '/tickets/relatorios', label: 'Relatórios' },
    ],
  },
  {
    label: 'Cadastro',
    defaultOpen: true,
    items: [
      { href: '/clients',            label: 'Clientes' },
      { href: '/comercial/products', label: 'Produtos/Serviços' },
      { href: '/users',              label: 'Usuários' },
    ],
  },
  {
    label: 'Vendas',
    defaultOpen: true,
    items: [
      { href: '/comercial/proposals', label: 'Propostas' },
      { href: '/comercial/contracts', label: 'Contratos' },
      { href: '/comercial/crm',       label: 'CRM' },
    ],
  },
  {
    label: 'Configuração',
    defaultOpen: false,
    items: [
      { href: '/settings/permissions', label: 'Permissões' },
      { href: '/settings/company',     label: 'Dados da empresa' },
    ],
  },
]

function NavGroup({ group, userRole }: { group: NavGroup; userRole: string }) {
  const pathname = usePathname()
  const visibleItems = group.items.filter(i => !i.roles || i.roles.includes(userRole))
  if (visibleItems.length === 0) return null

  const hasActive = visibleItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const [open, setOpen] = useState(group.defaultOpen || hasActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-1 mb-0.5 rounded-md hover:bg-zinc-800/60 transition-colors group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-500 transition-colors">
          {group.label}
        </span>
        <span className={`text-zinc-700 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-0.5 mb-1">
          {visibleItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SidebarNav({ userRole }: { userRole: string }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
      {NAV_GROUPS.map(group => (
        <NavGroup key={group.label} group={group} userRole={userRole} />
      ))}
    </nav>
  )
}
