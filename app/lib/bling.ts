import { adminPrisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

const BLING_AUTH_URL  = 'https://www.bling.com.br/Api/v3/oauth/authorize'
const BLING_TOKEN_URL = 'https://bling.com.br/Api/v3/oauth/token'
const BLING_API       = 'https://bling.com.br/Api/v3'

function clientId()     { return process.env.BLING_CLIENT_ID! }
function clientSecret() { return process.env.BLING_CLIENT_SECRET! }
function appUrl()       { return (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '') }
function basicAuth()    { return Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64') }

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function getBlingAuthUrl(orgId: string): string {
  const state  = Buffer.from(orgId).toString('base64url')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId(),
    state,
  })
  return `${BLING_AUTH_URL}?${params}`
}

interface BlingTokens {
  access_token:  string
  refresh_token: string
  expires_in:    number
}

export async function exchangeCode(code: string): Promise<BlingTokens> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth()}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: `${appUrl()}/api/bling/callback`,
    }),
  })
  if (!res.ok) throw new Error(`Bling token exchange: ${res.status} ${await res.text()}`)
  return res.json() as Promise<BlingTokens>
}

async function doRefresh(refreshToken: string): Promise<BlingTokens> {
  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth()}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Bling token refresh: ${res.status} ${await res.text()}`)
  return res.json() as Promise<BlingTokens>
}

export async function saveTokens(orgId: string, tokens: BlingTokens) {
  const expires_at = new Date(Date.now() + tokens.expires_in * 1000)
  await adminPrisma.blingIntegration.upsert({
    where:  { organization_id: orgId },
    create: {
      organization_id:   orgId,
      access_token_enc:  encrypt(tokens.access_token),
      refresh_token_enc: encrypt(tokens.refresh_token),
      expires_at,
    },
    update: {
      access_token_enc:  encrypt(tokens.access_token),
      refresh_token_enc: encrypt(tokens.refresh_token),
      expires_at,
    },
  })
}

export async function getAccessToken(orgId: string): Promise<string> {
  const row = await adminPrisma.blingIntegration.findUnique({
    where: { organization_id: orgId },
  })
  if (!row) throw new Error('Bling não conectado para esta organização.')

  // Refresh if expiring within 5 minutes
  if (row.expires_at.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshToken = decrypt(row.refresh_token_enc)
    const tokens       = await doRefresh(refreshToken)
    await saveTokens(orgId, tokens)
    return tokens.access_token
  }

  return decrypt(row.access_token_enc)
}

// ─── Contacts sync ───────────────────────────────────────────────────────────

interface BlingContato {
  id:               number
  nome:             string
  fantasia?:        string
  numeroDocumento?: string
  email?:           string
  telefone?:        string
  situacao?:        string
  emails?:          Array<{ email: string; tipo?: { id: number; descricao: string } }>
  endereco?: {
    endereco?:    string   // street name (v3 field name matches parent key)
    geral?:       string   // v2 fallback
    numero?:      string
    complemento?: string
    bairro?:      string
    municipio?:   string
    uf?:          string
    cep?:         string
  }
}

function extractEmails(c: BlingContato): { email: string | null; email_nfe: string | null } {
  if (!c.emails?.length) return { email: c.email ?? null, email_nfe: null }

  const nfeEntry     = c.emails.find(e => e.tipo?.descricao?.toLowerCase().includes('nf'))
  const primaryEntry = c.emails.find(e => !e.tipo?.descricao?.toLowerCase().includes('nf')) ?? c.emails[0]

  return {
    email:     primaryEntry?.email ?? c.email ?? null,
    email_nfe: nfeEntry?.email ?? null,
  }
}

function buildAddress(e?: BlingContato['endereco']): {
  address: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_district: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
} {
  const empty = {
    address: null, address_street: null, address_number: null,
    address_complement: null, address_district: null,
    address_city: null, address_state: null, address_zip: null,
  }
  if (!e) return empty
  const street = e.endereco ?? e.geral ?? null
  return {
    address:            [street, e.numero, e.municipio, e.uf, e.cep].filter(Boolean).join(', ') || null,
    address_street:     street,
    address_number:     e.numero     ?? null,
    address_complement: e.complemento ?? null,
    address_district:   e.bairro     ?? null,
    address_city:       e.municipio  ?? null,
    address_state:      e.uf         ?? null,
    address_zip:        e.cep        ?? null,
  }
}

export interface SyncResult {
  upserted: number
  skipped:  number
  errors:   number
}

export async function syncContatos(orgId: string): Promise<SyncResult> {
  const accessToken = await getAccessToken(orgId)
  const result: SyncResult = { upserted: 0, skipped: 0, errors: 0 }
  let page = 1

  while (true) {
    const res = await fetch(
      `${BLING_API}/contatos?pagina=${page}&limite=100&situacao=A`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Bling contatos: ${res.status} ${await res.text()}`)

    const body = (await res.json()) as { data?: BlingContato[] }
    const contacts = body.data ?? []
    if (!contacts.length) break

    for (const c of contacts) {
      const cnpj = c.numeroDocumento?.replace(/\D/g, '') ?? ''
      if (cnpj.length !== 14) { result.skipped++; continue }

      const { email, email_nfe } = extractEmails(c)
      const addr = buildAddress(c.endereco)

      try {
        await adminPrisma.client.upsert({
          where:  { organization_id_cnpj: { organization_id: orgId, cnpj } },
          create: {
            organization_id: orgId,
            cnpj,
            name:       c.nome,
            trade_name: c.fantasia ?? null,
            email,
            email_nfe,
            phone:      c.telefone ?? null,
            is_active:  c.situacao !== 'I',
            bling_id:   String(c.id),
            ...addr,
          },
          update: {
            name:       c.nome,
            trade_name: c.fantasia ?? null,
            email,
            email_nfe,
            phone:      c.telefone ?? null,
            is_active:  c.situacao !== 'I',
            bling_id:   String(c.id),
            ...addr,
          },
        })
        result.upserted++
      } catch {
        result.errors++
      }
    }

    if (contacts.length < 100) break
    page++
  }

  await adminPrisma.blingIntegration.update({
    where: { organization_id: orgId },
    data:  { last_sync_at: new Date() },
  })

  return result
}

// ─── Accounts Receivable sync ─────────────────────────────────────────────────

export interface ReceivableFilters {
  dataVencimentoInicio?: string  // YYYY-MM-DD
  dataVencimentoFim?: string
  dataEmissaoInicio?: string
  dataEmissaoFim?: string
  situacoes?: number[]           // 1=Em Aberto 2=Recebido 3=Cancelado 9=Parcial
}

interface BlingContaReceber {
  id:              number
  situacao:        number
  vencimento:      string
  dataEmissao?:    string
  competencia?:    string
  nroDocumento?:   string
  valor:           number
  saldo?:          number   // not always present in list endpoint
  historico?:      string
  contato?: {
    id:               number
    nome:             string
    numeroDocumento?: string
  }
  categoria?: { descricao: string }
}

export async function syncContasReceber(orgId: string, filters: ReceivableFilters): Promise<SyncResult> {
  const accessToken = await getAccessToken(orgId)
  const result: SyncResult = { upserted: 0, skipped: 0, errors: 0 }
  let page = 1

  while (true) {
    const params = new URLSearchParams({ pagina: String(page), limite: '100' })
    if (filters.dataVencimentoInicio) params.set('dataVencimentoInicio', filters.dataVencimentoInicio)
    if (filters.dataVencimentoFim)   params.set('dataVencimentoFim',    filters.dataVencimentoFim)
    if (filters.dataEmissaoInicio)   params.set('dataEmissaoInicio',    filters.dataEmissaoInicio)
    if (filters.dataEmissaoFim)      params.set('dataEmissaoFim',       filters.dataEmissaoFim)
    if (filters.situacoes?.length) {
      filters.situacoes.forEach(s => params.append('situacoes[]', String(s)))
    }

    const url = `${BLING_API}/contas/receber?${params}`
    console.log('[bling] GET', url)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    const rawText = await res.text()
    console.log('[bling] status', res.status, 'body', rawText.slice(0, 500))
    if (!res.ok) throw new Error(`Bling contasreceber: ${res.status} ${rawText}`)

    // Bling API v3: some endpoints return { data: [...] }, others return { data: { data: [...], paginator: {} } }
    const raw = JSON.parse(rawText) as { data?: BlingContaReceber[] | { data: BlingContaReceber[] } }
    const items: BlingContaReceber[] = Array.isArray(raw.data)
      ? raw.data
      : ((raw.data as any)?.data ?? [])
    console.log('[bling] items count', items.length)
    if (!items.length) break

    for (const item of items) {
      try {
        await adminPrisma.accountReceivable.upsert({
          where: { organization_id_bling_id: { organization_id: orgId, bling_id: String(item.id) } },
          create: {
            organization_id: orgId,
            bling_id:        String(item.id),
            client_name:     item.contato?.nome ?? 'Desconhecido',
            client_cnpj:     item.contato?.numeroDocumento?.replace(/\D/g, '') || null,
            document_number: item.nroDocumento ?? null,
            due_date:        new Date(item.vencimento),
            competence_date: item.competencia ? new Date(item.competencia)
                           : item.dataEmissao  ? new Date(item.dataEmissao) : null,
            value:           item.valor,
            balance:         item.saldo ?? item.valor,
            status:          item.situacao,
            description:     item.historico ?? null,
            category:        item.categoria?.descricao ?? null,
          },
          update: {
            client_name:     item.contato?.nome ?? 'Desconhecido',
            client_cnpj:     item.contato?.numeroDocumento?.replace(/\D/g, '') || null,
            document_number: item.nroDocumento ?? null,
            due_date:        new Date(item.vencimento),
            competence_date: item.competencia ? new Date(item.competencia)
                           : item.dataEmissao  ? new Date(item.dataEmissao) : null,
            value:           item.valor,
            balance:         item.saldo ?? item.valor,
            status:          item.situacao,
            description:     item.historico ?? null,
            category:        item.categoria?.descricao ?? null,
          },
        })
        result.upserted++
      } catch (e) {
        console.error('[bling] upsert error id', item.id, (e as Error)?.message ?? e)
        result.errors++
      }
    }

    if (items.length < 100) break
    page++
  }

  return result
}

// ─── Update contact in Bling ──────────────────────────────────────────────────

export interface BlingContactUpdate {
  name?:              string
  trade_name?:        string
  email?:             string
  email_boleto?:      string
  phone?:             string
  address_street?:    string
  address_number?:    string
  address_complement?:string
  address_district?:  string
  address_city?:      string
  address_state?:     string
  address_zip?:       string
}

export async function updateContatoBling(
  orgId:   string,
  blingId: string,
  data:    BlingContactUpdate,
): Promise<void> {
  const token = await getAccessToken(orgId)
  // PUT replaces the whole resource — tipo and situacao are always required by Bling
  const body: Record<string, unknown> = {
    tipo:     'J',  // all clients are CNPJ (juridical)
    situacao: 'A',  // active
  }
  if (data.name        !== undefined) body.nome     = data.name
  if (data.trade_name  !== undefined) body.fantasia  = data.trade_name
  if (data.email       !== undefined) body.email    = data.email
  if (data.phone       !== undefined) body.fone     = data.phone

  const hasAddress = [
    data.address_street, data.address_number, data.address_complement,
    data.address_district, data.address_city, data.address_state, data.address_zip,
  ].some(v => v !== undefined)

  if (hasAddress) {
    body.endereco = {
      endereco:    data.address_street    ?? '',
      numero:      data.address_number    ?? '',
      complemento: data.address_complement ?? '',
      bairro:      data.address_district  ?? '',
      municipio:   data.address_city      ?? '',
      uf:          data.address_state     ?? '',
      cep:         data.address_zip       ?? '',
    }
  }

  const res = await fetch(`${BLING_API}/contatos/${blingId}`, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bling update contato ${blingId}: ${res.status} ${err}`)
  }
}
