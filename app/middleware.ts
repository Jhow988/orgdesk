import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseSubdomain } from '@/lib/tenant-utils'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/health',
  '/api/track',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
]

export default auth(async function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || ''

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Auth check
  const session = (req as { auth?: { user?: { id: string } } }).auth
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { slug, isPortal } = parseSubdomain(hostname)

  const requestHeaders = new Headers(req.headers)
  if (slug) {
    requestHeaders.set('x-org-slug', slug)
    requestHeaders.set('x-is-portal', isPortal ? '1' : '0')
  }

  if (isPortal && slug && !pathname.startsWith('/portal') && !pathname.startsWith('/api')) {
    return NextResponse.rewrite(
      new URL(`/portal${pathname}`, req.url),
      { request: { headers: requestHeaders } }
    )
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
