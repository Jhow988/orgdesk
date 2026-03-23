'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, FileText, Zap, Receipt,
  Megaphone, BarChart2, MessageSquare, Users, Package,
  UserCog, FileCheck, FileSignature, Briefcase, Shield,
  Settings, MapPin, Send, SendHorizonal,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: '',
    items: [
      { href: '/dashboard',    label: 'Visão Geral',   icon: LayoutDashboard },
      { href: '/organizations', label: 'Organizações', icon: Building2, roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro/enviar-cobranca', label: 'Enviar Cobrança',   icon: SendHorizonal },
      { href: '/campaigns',                  label: 'Campanhas',         icon: Megaphone },
      { href: '/invoices',                   label: 'Contas a Receber',  icon: Receipt },
      { href: '/financeiro/rastreamento',    label: 'Rastreamento',      icon: MapPin },
      { href: '/financeiro/log-envios',      label: 'Log de Envios',     icon: Send },
      { href: '/financeiro/relatorios',      label: 'Relatórios',        icon: BarChart2 },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { href: '/tickets',            label: 'Chamados',   icon: MessageSquare },
      { href: '/tickets/relatorios', label: 'Relatórios', icon: BarChart2 },
    ],
  },
  {
    label: 'Cadastro',
    items: [
      { href: '/clients',            label: 'Clientes',          icon: Users },
      { href: '/comercial/products', label: 'Produtos/Serviços', icon: Package },
      { href: '/users',              label: 'Usuários',          icon: UserCog },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { href: '/comercial/proposals', label: 'Propostas', icon: FileCheck },
      { href: '/comercial/contracts', label: 'Contratos', icon: FileSignature },
      { href: '/comercial/crm',       label: 'CRM',       icon: Briefcase },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/settings/permissions', label: 'Permissões',       icon: Shield },
      { href: '/settings/company',     label: 'Dados da empresa', icon: Settings },
    ],
  },
]

function NavItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`}
    >
      <Icon
        size={14}
        className={active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}
        strokeWidth={active ? 2 : 1.5}
      />
      {item.label}
    </Link>
  )
}

export function SidebarNav({ userRole }: { userRole: string }) {
  return (
    <nav className="flex-1 overflow-y-auto py-2 px-2">
      {NAV_SECTIONS.map((section, i) => {
        const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(userRole))
        if (visibleItems.length === 0) return null

        return (
          <div key={i} className={i > 0 ? 'mt-4' : ''}>
            {section.label && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {visibleItems.map(item => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
