import { adminPrisma } from './prisma'

interface LogParams {
  orgId:     string
  userId?:   string
  action:    string          // e.g. 'user.created'
  entity?:   string          // e.g. 'user', 'proposal'
  entityId?: string
  payload?:  Record<string, unknown>
}

/** Write an entry to activity_log. Fire-and-forget safe — errors are swallowed. */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    await adminPrisma.activityLog.create({
      data: {
        organization_id: params.orgId,
        user_id:         params.userId ?? null,
        action:          params.action,
        entity:          params.entity ?? null,
        entity_id:       params.entityId ?? null,
        payload:         params.payload ?? undefined,
      },
    })
  } catch {
    // Never let logging break the main operation
  }
}

// ─── Human-readable labels (used in the UI) ──────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  'user.created':            'Usuário criado',
  'user.updated':            'Usuário atualizado',
  'user.activated':          'Usuário ativado',
  'user.deactivated':        'Usuário desativado',
  'proposal.created':        'Proposta criada',
  'proposal.status_changed': 'Status da proposta alterado',
  'contract.created':        'Contrato criado',
  'contract.sent':           'Contrato enviado',
  'contract.cancelled':      'Contrato cancelado',
  'product.created':         'Produto/Serviço criado',
  'product.updated':         'Produto/Serviço atualizado',
  'product.toggled':         'Produto/Serviço ativado/desativado',
  'campaign.created':        'Campanha criada',
  'campaign.activated':      'Campanha ativada',
  'campaign.deleted':        'Campanha excluída',
  'permissions.updated':     'Permissões atualizadas',
  'settings.updated':        'Configurações atualizadas',
}

export const ENTITY_LABELS: Record<string, string> = {
  user:        'Usuário',
  proposal:    'Proposta',
  contract:    'Contrato',
  product:     'Produto/Serviço',
  campaign:    'Campanha',
  permissions: 'Permissões',
  settings:    'Configurações',
}

export const ACTION_COLOR: Record<string, string> = {
  'user.created':            'text-emerald-400',
  'user.updated':            'text-amber-400',
  'user.activated':          'text-emerald-400',
  'user.deactivated':        'text-red-400',
  'proposal.created':        'text-emerald-400',
  'proposal.status_changed': 'text-amber-400',
  'contract.created':        'text-emerald-400',
  'contract.sent':           'text-blue-400',
  'contract.cancelled':      'text-red-400',
  'product.created':         'text-emerald-400',
  'product.updated':         'text-amber-400',
  'product.toggled':         'text-amber-400',
  'campaign.created':        'text-emerald-400',
  'campaign.activated':      'text-blue-400',
  'campaign.deleted':        'text-red-400',
  'permissions.updated':     'text-violet-400',
  'settings.updated':        'text-amber-400',
}
