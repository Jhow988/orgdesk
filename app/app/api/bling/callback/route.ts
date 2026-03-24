import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, saveTokens } from '@/lib/bling'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = new URL('/clients', req.url)

  if (error) {
    base.searchParams.set('bling_error', error)
    return NextResponse.redirect(base)
  }

  if (!code || !state) {
    base.searchParams.set('bling_error', 'missing_params')
    return NextResponse.redirect(base)
  }

  let orgId: string
  try {
    orgId = Buffer.from(state, 'base64url').toString()
  } catch {
    base.searchParams.set('bling_error', 'invalid_state')
    return NextResponse.redirect(base)
  }

  try {
    const tokens = await exchangeCode(code)
    await saveTokens(orgId, tokens)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown_error'
    base.searchParams.set('bling_error', msg.slice(0, 100))
    return NextResponse.redirect(base)
  }

  base.searchParams.set('bling_connected', '1')
  return NextResponse.redirect(base)
}
