// Module definitions — plain file (no 'use server') so it can be imported by client components

export type AccessLevel = 'NONE' | 'READ' | 'EDIT' | 'CREATE' | 'FULL'

export const ACCESS_LEVELS: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'NONE',   label: 'Sem acesso',       color: 'text-zinc-500' },
  { value: 'READ',   label: 'Somente leitura',  color: 'text-blue-400' },
  { value: 'EDIT',   label: 'Edição',           color: 'text-amber-400' },
  { value: 'CREATE', label: 'Criação',          color: 'text-violet-400' },
  { value: 'FULL',   label: 'Acesso total',     color: 'text-emerald-400' },
]

// Hierarchy: FULL > CREATE > EDIT > READ > NONE
const ACCESS_RANK: Record<AccessLevel, number> = {
  NONE: 0, READ: 1, EDIT: 2, CREATE: 3, FULL: 4,
}

export function hasAccess(access: AccessLevel, required: AccessLevel): boolean {
  return ACCESS_RANK[access] >= ACCESS_RANK[required]
}

export interface ModuleDef {
  key: string
  label: string
  section: string
}

export const MODULES: ModuleDef[] = [
  // Cadastro
  { key: 'clients',            label: 'Clientes',          section: 'Cadastro' },
  { key: 'products',           label: 'Produtos/Serviços', section: 'Cadastro' },
  { key: 'users',              label: 'Usuários',          section: 'Cadastro' },
  // Vendas
  { key: 'proposals',          label: 'Propostas',         section: 'Vendas' },
  { key: 'contracts',          label: 'Contratos',         section: 'Vendas' },
  { key: 'crm',                label: 'CRM',               section: 'Vendas' },
  // Financeiro
  { key: 'cobranca',           label: 'Enviar Cobrança',   section: 'Financeiro' },
  { key: 'campaigns',          label: 'Campanhas',         section: 'Financeiro' },
  { key: 'invoices',           label: 'Contas a Receber',  section: 'Financeiro' },
  { key: 'rastreamento',       label: 'Rastreamento',      section: 'Financeiro' },
  { key: 'log_envios',         label: 'Log de Envios',     section: 'Financeiro' },
  { key: 'fin_relatorios',     label: 'Relatórios',        section: 'Financeiro' },
  // Suporte
  { key: 'tickets',            label: 'Chamados',          section: 'Suporte' },
  { key: 'tickets_relatorios', label: 'Relatórios',        section: 'Suporte' },
  // Configurações
  { key: 'settings_company',   label: 'Dados da empresa',  section: 'Configurações' },
  { key: 'settings_email',     label: 'Perfil de E-mail',  section: 'Configurações' },
]

// Default access per role when no custom permission is configured
export const ROLE_DEFAULT_ACCESS: Record<string, Record<string, AccessLevel>> = {
  ORG_ADMIN: Object.fromEntries(MODULES.map(m => [m.key, 'FULL' as AccessLevel])),
  ORG_FINANCE: {
    clients:             'EDIT',
    products:            'READ',
    users:               'NONE',
    proposals:           'CREATE',
    contracts:           'READ',
    crm:                 'NONE',
    cobranca:            'FULL',
    campaigns:           'FULL',
    invoices:            'FULL',
    rastreamento:        'READ',
    log_envios:          'READ',
    fin_relatorios:      'READ',
    tickets:             'READ',
    tickets_relatorios:  'NONE',
    settings_company:    'NONE',
    settings_email:      'NONE',
  },
  ORG_SUPPORT: {
    clients:             'READ',
    products:            'NONE',
    users:               'NONE',
    proposals:           'NONE',
    contracts:           'NONE',
    crm:                 'NONE',
    cobranca:            'NONE',
    campaigns:           'NONE',
    invoices:            'NONE',
    rastreamento:        'NONE',
    log_envios:          'NONE',
    fin_relatorios:      'NONE',
    tickets:             'FULL',
    tickets_relatorios:  'READ',
    settings_company:    'NONE',
    settings_email:      'NONE',
  },
}

/** Returns the effective access level for a user, merging custom overrides with role defaults */
export function getEffectiveAccess(
  role: string,
  module: string,
  customPermissions: Record<string, AccessLevel>,
): AccessLevel {
  if (customPermissions[module] !== undefined) return customPermissions[module]
  return ROLE_DEFAULT_ACCESS[role]?.[module] ?? 'NONE'
}

/** Builds a full module→access map for a user */
export function buildModuleAccessMap(
  role: string,
  customPermissions: Record<string, AccessLevel>,
): Record<string, AccessLevel> {
  const map: Record<string, AccessLevel> = {}
  for (const m of MODULES) {
    map[m.key] = getEffectiveAccess(role, m.key, customPermissions)
  }
  return map
}
