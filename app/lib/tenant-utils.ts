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
  // stub — cache invalidation handled server-side
}
