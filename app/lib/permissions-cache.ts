import { adminPrisma } from './prisma'
import type { AccessLevel } from './modules'

// ─── Cache em memória por userId ──────────────────────────────────────────────
// TTL curto (2 min) para refletir mudanças de permissão rapidamente.
// Em instância única (Coolify) isso é suficiente — sem necessidade de Redis.

const TTL_MS = 2 * 60 * 1000 // 2 minutos

interface CacheEntry {
  custom:    Record<string, AccessLevel>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

// ─── Busca permissões customizadas do usuário (com cache) ─────────────────────
export async function getCustomPermissions(
  userId: string,
  orgId:  string,
): Promise<Record<string, AccessLevel>> {
  const key = `${userId}:${orgId}`
  const now = Date.now()
  const hit = cache.get(key)

  if (hit && hit.expiresAt > now) return hit.custom

  const membership = await adminPrisma.membership.findUnique({
    where:   { user_id_organization_id: { user_id: userId, organization_id: orgId } },
    include: { permissions: true },
  })

  const custom: Record<string, AccessLevel> = {}
  for (const p of membership?.permissions ?? []) {
    custom[p.module] = p.access as AccessLevel
  }

  cache.set(key, { custom, expiresAt: now + TTL_MS })
  return custom
}

// ─── Invalida cache de um usuário (chamar ao salvar permissões) ───────────────
export function invalidatePermissionsCache(userId: string, orgId: string) {
  cache.delete(`${userId}:${orgId}`)
}
