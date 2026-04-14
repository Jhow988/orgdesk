import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginLimiter, apiLimiter, getIp, retryAfterSeconds } from '@/lib/rate-limit'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth',
  '/api/health',
  '/api/track',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
]

// Rotas de login (painel + portal) — rate limit restrito
const LOGIN_PATHS = [
  '/api/auth/callback/credentials',
]

export default auth(async function proxy(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const ip = getIp(req)

  // ── Rate limit de login (brute force) ──────────────────────────────────────
  if (req.method === 'POST' && LOGIN_PATHS.some(p => pathname.startsWith(p))) {
    try {
      await loginLimiter.consume(ip)
    } catch (err: unknown) {
      const secs = retryAfterSeconds(err as Parameters<typeof retryAfterSeconds>[0])
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${secs} segundos.` },
        { status: 429, headers: { 'Retry-After': String(secs) } },
      )
    }
  }

  // ── Rate limit geral de API ─────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    try {
      await apiLimiter.consume(ip)
    } catch (err: unknown) {
      const secs = retryAfterSeconds(err as Parameters<typeof retryAfterSeconds>[0])
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': String(secs) } },
      )
    }
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = (req as { auth?: { user?: { role?: string } } }).auth
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = session.user.role

  // CLIENT_PORTAL só acessa /portal
  if (role === 'CLIENT_PORTAL' && !pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  // Outros usuários não acessam /portal
  if (role !== 'CLIENT_PORTAL' && pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
