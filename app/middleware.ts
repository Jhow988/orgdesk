import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseSubdomain } from '@/lib/tenant-utils'

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

  // Injeta slug nos headers — resolução completa do tenant nas API routes/Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-org-slug', slug)
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
