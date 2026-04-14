import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'

// ─── Login: máx 10 tentativas por IP a cada 15 minutos ───────────────────────
// Protege contra brute force de senha (painel e portal)
export const loginLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 15,      // 15 minutos
  blockDuration: 60 * 15, // bloqueia por 15 minutos após esgotar
})

// ─── API geral: máx 120 req/min por IP ───────────────────────────────────────
// Protege contra abuso de endpoints (scraping, enumeration, etc.)
export const apiLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
})

// ─── Helper: extrai IP real considerando proxy/Traefik ───────────────────────
export function getIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

// ─── Helper: retorna segundos restantes de forma legível ─────────────────────
export function retryAfterSeconds(err: RateLimiterRes): number {
  return Math.ceil((err.msBeforeNext ?? 0) / 1000)
}
