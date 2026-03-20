import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseSubdomain, resolveOrganizationBySlug } from '@/lib/tenant'

// Rotas que não precisam de tenant
const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth',
  '/api/track',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Ignora rotas públicas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const { slug, isPortal } = parseSubdomain(hostname)

  // Sem slug = landing page ou admin global
  if (!slug) {
    return NextResponse.next()
  }

  // Resolve o tenant
  const org = await resolveOrganizationBySlug(slug)

  if (!org) {
    return NextResponse.rewrite(new URL('/not-found', request.url))
  }

  if (!org.is_active) {
    return NextResponse.rewrite(new URL('/suspended', request.url))
  }

  // Injeta contexto nos headers para uso nas API routes e Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-org-id', org.id)
  requestHeaders.set('x-org-slug', org.slug)
  requestHeaders.set('x-org-name', org.name)
  requestHeaders.set('x-is-portal', isPortal ? '1' : '0')

  // Rewrite de URL para rotas do portal
  if (isPortal && !pathname.startsWith('/portal') && !pathname.startsWith('/api')) {
    return NextResponse.rewrite(
      new URL(`/portal${pathname}`, request.url),
      { request: { headers: requestHeaders } }
    )
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
