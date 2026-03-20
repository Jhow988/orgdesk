import { adminPrisma } from './prisma'

// Cache simples em memória para desenvolvimento
// Em produção, usar Redis
const orgCache = new Map<string, { data: OrgCacheEntry; expiresAt: number }>()

interface OrgCacheEntry {
  id: string
  slug: string
  name: string
  plan: string
  is_active: boolean
}

export async function resolveOrganizationBySlug(slug: string): Promise<OrgCacheEntry | null> {
  const now = Date.now()
  const cached = orgCache.get(slug)

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const org = await adminPrisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, plan: true, is_active: true },
  })

  if (org) {
    orgCache.set(slug, { data: org, expiresAt: now + 5 * 60 * 1000 }) // 5 min TTL
  }

  return org
}

export function parseSubdomain(hostname: string): { slug: string | null; isPortal: boolean } {
  // Remove porta se presente
  const host = hostname.split(':')[0]
  const baseDomain = (process.env.APP_BASE_DOMAIN || 'localhost').split(':')[0]

  if (host === baseDomain || host === `www.${baseDomain}`) {
    return { slug: null, isPortal: false }
  }

  const parts = host.replace(`.${baseDomain}`, '').split('.')

  // portal.empresa → isPortal=true, slug=empresa
  if (parts[0] === 'portal' && parts.length >= 2) {
    return { slug: parts[1], isPortal: true }
  }

  // admin → reservado para super admin
  if (parts[0] === 'admin') {
    return { slug: null, isPortal: false }
  }

  // empresa → isPortal=false, slug=empresa
  return { slug: parts[0], isPortal: false }
}

export function invalidateOrgCache(slug: string) {
  orgCache.delete(slug)
}
