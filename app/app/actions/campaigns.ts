'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { uploadFile, deleteFile, buildKey } from '@/lib/storage'
import { extrairCnpjDaPagina, extrairCnpjBoleto } from '@/lib/pdf-extractor'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── helpers ────────────────────────────────────────────────────────────────

// Regex flexível que encontra um CNPJ no texto do PDF independente de espaços ou
// variações de pontuação: aceita XX.XXX.XXX/XXXX-XX e variações com espaços.
function cnpjRegex(cnpj: string): RegExp {
  const d = cnpj // 14 dígitos
  return new RegExp(
    `${d.slice(0,2)}[.\\s]?${d.slice(2,5)}[.\\s]?${d.slice(5,8)}[/\\s]?${d.slice(8,12)}[-\\s]?${d.slice(12)}`
  )
}

function monthYearToLabel(iso: string): string {
  // iso = "2026-03"  →  "03/2026"
  const [y, m] = iso.split('-')
  return `${m}/${y}`
}

async function parsePdfPages(buffer: Buffer): Promise<string[]> {
  // pdf-parse v1.1.1 bundles its own pdfjs 1.10.100 (no native deps, no DOMMatrix needed).
  // The pagerender callback works reliably with this old bundled pdfjs version.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const pages: string[] = []

  await pdfParse(buffer, {
    pagerender(pageData: any) {
      return pageData.getTextContent().then((content: any) => {
        const text = (content.items as any[]).map((i: any) => i.str ?? '').join(' ')
        pages.push(text)
        return text
      })
    },
  })

  return pages
}

// ─── create campaign ────────────────────────────────────────────────────────

export type CampaignState = { error?: string } | null

export async function createCampaignAction(prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { slug: true },
  })
  if (!org) return { error: 'Organização não encontrada.' }

  const monthYear = formData.get('month_year') as string // "2026-03"
  const nfFile    = formData.get('pdf_nf') as File | null
  const bolFile   = formData.get('pdf_boleto') as File | null

  if (!monthYear) return { error: 'Informe o mês/ano.' }
  if (!nfFile || nfFile.size === 0) return { error: 'O PDF de NFs é obrigatório.' }

  const label = monthYearToLabel(monthYear)
  const slug  = monthYear // "2026-03"

  const existing = await prisma.campaign.findUnique({
    where: { organization_id_slug: { organization_id: session.user.orgId, slug } },
  })
  if (existing) return { error: `Já existe uma campanha para ${label}.` }

  // Upload NF PDF
  const nfBuffer = Buffer.from(await nfFile.arrayBuffer())
  const nfKey    = buildKey(org.slug, 'campaigns', slug, 'nf.pdf')
  await uploadFile(nfKey, nfBuffer, 'application/pdf')
  const kbNf = nfFile.size / 1024

  // Upload Boleto PDF (optional)
  let bolKey: string | null = null
  let kbBol: number | null = null
  if (bolFile && bolFile.size > 0) {
    const bolBuffer = Buffer.from(await bolFile.arrayBuffer())
    bolKey = buildKey(org.slug, 'campaigns', slug, 'boleto.pdf')
    await uploadFile(bolKey, bolBuffer, 'application/pdf')
    kbBol = bolFile.size / 1024
  }

  await prisma.campaign.create({
    data: {
      organization_id: session.user.orgId,
      slug,
      month_year: slug,
      label,
      status: 'DRAFT',
      pdf_nf_key: nfKey,
      pdf_boleto_key: bolKey,
      kb_nf: kbNf,
      kb_boleto: kbBol,
    },
  })

  revalidatePath('/campaigns')
  return null
}

// ─── shared: fetch S3 + parse PDFs ──────────────────────────────────────────

async function buildS3Client() {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    endpoint: `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId:     process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
  })
}

async function fetchBuffer(key: string): Promise<Buffer> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = await buildS3Client()
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.MINIO_BUCKET!, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

interface CampaignMatch {
  cnpj:        string
  clientName:  string
  email:       string | null
  nfPages:     number[]
  boletoPages: number[]
  hasBoth:     boolean   // CNPJ appears in both NF and boleto
}

async function buildMatches(campaignId: string, orgId: string): Promise<{
  matches?: CampaignMatch[]
  cnpjsIgnore: string[]
  error?: string
}> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organization_id: orgId },
  })
  if (!campaign) return { cnpjsIgnore: [], error: 'Campanha não encontrada.' }
  if (!campaign.pdf_nf_key) return { cnpjsIgnore: [], error: 'PDF de NFs não encontrado.' }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { cnpjs_ignore: true },
  })
  const cnpjsIgnore = org?.cnpjs_ignore ?? []

  // NF PDF
  let nfBuffer: Buffer
  try { nfBuffer = await fetchBuffer(campaign.pdf_nf_key) }
  catch (e: any) { return { cnpjsIgnore, error: `Erro ao buscar PDF de NFs: ${e?.message ?? e}` } }

  let nfPages: string[]
  try { nfPages = await parsePdfPages(nfBuffer) }
  catch (e: any) { return { cnpjsIgnore, error: `Erro ao processar PDF de NFs: ${e?.message ?? e}` } }

  const cnpjNfPages: Map<string, number[]> = new Map()
  nfPages.forEach((text, idx) => {
    const cnpj = extrairCnpjDaPagina(text, idx + 1)
    if (cnpj && !cnpjsIgnore.includes(cnpj)) {
      cnpjNfPages.set(cnpj, [...(cnpjNfPages.get(cnpj) ?? []), idx + 1])
    }
  })

  // Boleto PDF
  const bolCnpjPage: Map<string, number> = new Map()
  let bolPagesTexts: string[] = []
  if (campaign.pdf_boleto_key) {
    try {
      const bolBuffer = await fetchBuffer(campaign.pdf_boleto_key)
      bolPagesTexts   = await parsePdfPages(bolBuffer)
      bolPagesTexts.forEach((text, idx) => {
        const cnpj = extrairCnpjBoleto(text, cnpjsIgnore)
        if (cnpj && !bolCnpjPage.has(cnpj)) bolCnpjPage.set(cnpj, idx + 1)
      })
    } catch { /* boleto optional */ }
  }

  // Secondary pass: for NF CNPJs not matched by the extractor, search the
  // formatted CNPJ string directly in each boleto page text (catches "Sacado" layouts)
  if (bolPagesTexts.length > 0) {
    for (const cnpj of cnpjNfPages.keys()) {
      if (bolCnpjPage.has(cnpj)) continue
      bolPagesTexts.forEach((text, idx) => {
        if (!bolCnpjPage.has(cnpj) && cnpjRegex(cnpj).test(text)) {
          bolCnpjPage.set(cnpj, idx + 1)
        }
      })
    }
  }

  // Load clients
  const clients = await prisma.client.findMany({
    where: { organization_id: orgId },
    select: { cnpj: true, name: true, email: true, email_nfe: true, email_boleto: true },
  })
  const clientByCnpj = new Map(clients.map(c => [c.cnpj.replace(/\D/g, ''), c]))

  const matches: CampaignMatch[] = []
  const seen = new Set<string>()

  for (const [cnpj, nfPgs] of cnpjNfPages.entries()) {
    seen.add(cnpj)
    const client = clientByCnpj.get(cnpj)
    const bolPgs = bolCnpjPage.has(cnpj) ? [bolCnpjPage.get(cnpj)!] : []
    const email  = client?.email_nfe ?? client?.email ?? null
    matches.push({ cnpj, clientName: client?.name ?? cnpj, email, nfPages: nfPgs, boletoPages: bolPgs, hasBoth: bolPgs.length > 0 })
  }

  for (const [cnpj, bolPg] of bolCnpjPage.entries()) {
    if (seen.has(cnpj)) continue
    const client = clientByCnpj.get(cnpj)
    const email  = client?.email_boleto ?? client?.email ?? null
    matches.push({ cnpj, clientName: client?.name ?? cnpj, email, nfPages: [], boletoPages: [bolPg], hasBoth: false })
  }

  return { matches, cnpjsIgnore }
}

// ─── preview campaign (no DB writes) ─────────────────────────────────────────

export async function previewCampaignAction(campaignId: string): Promise<{
  matches?: CampaignMatch[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }
  const { matches, error } = await buildMatches(campaignId, session.user.orgId)
  if (error) return { error }
  return { matches }
}

// ─── activate campaign ───────────────────────────────────────────────────────

export async function activateCampaignAction(campaignId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organization_id: session.user.orgId },
  })
  if (!campaign) return { error: 'Campanha não encontrada.' }
  if (!campaign.pdf_nf_key) return { error: 'PDF de NFs não encontrado.' }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { cnpjs_ignore: true },
  })
  const cnpjsIgnore = org?.cnpjs_ignore ?? []

  // Fetch NF PDF from MinIO via presigned URL (or use stored buffer)
  // We'll read directly from S3
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = new S3Client({
    endpoint: `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
  })

  async function fetchBuffer(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: process.env.MINIO_BUCKET!, Key: key })
    const res = await s3.send(cmd)
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as any) chunks.push(chunk)
    return Buffer.concat(chunks)
  }

  let nfBuffer: Buffer
  try {
    nfBuffer = await fetchBuffer(campaign.pdf_nf_key)
  } catch (e: any) {
    return { error: `Erro ao buscar PDF de NFs no storage: ${e?.message ?? e}` }
  }
  let nfPages: string[]
  try {
    nfPages = await parsePdfPages(nfBuffer)
  } catch (e: any) {
    return { error: `Erro ao processar PDF de NFs: ${e?.message ?? e}` }
  }

  // Map CNPJ → pages
  const cnpjPages: Map<string, number[]> = new Map()
  nfPages.forEach((pageText, idx) => {
    const cnpj = extrairCnpjDaPagina(pageText, idx + 1)
    if (cnpj && !cnpjsIgnore.includes(cnpj)) {
      const existing = cnpjPages.get(cnpj) ?? []
      cnpjPages.set(cnpj, [...existing, idx + 1])
    }
  })

  // Boleto: CNPJ → page index
  const bolCnpjPage: Map<string, number> = new Map()
  let bolPagesTexts: string[] = []
  if (campaign.pdf_boleto_key) {
    const bolBuffer = await fetchBuffer(campaign.pdf_boleto_key)
    bolPagesTexts   = await parsePdfPages(bolBuffer)
    bolPagesTexts.forEach((text, idx) => {
      const cnpj = extrairCnpjBoleto(text, cnpjsIgnore)
      if (cnpj && !bolCnpjPage.has(cnpj)) bolCnpjPage.set(cnpj, idx + 1)
    })
  }

  // Secondary pass: direct text search for NF CNPJs missed by the extractor
  if (bolPagesTexts.length > 0) {
    for (const cnpj of cnpjPages.keys()) {
      if (bolCnpjPage.has(cnpj)) continue
      bolPagesTexts.forEach((text, idx) => {
        if (!bolCnpjPage.has(cnpj) && cnpjRegex(cnpj).test(text)) {
          bolCnpjPage.set(cnpj, idx + 1)
        }
      })
    }
  }

  // Load all clients for this org
  const clients = await prisma.client.findMany({
    where: { organization_id: session.user.orgId },
    select: { id: true, cnpj: true, name: true, email: true, email_nfe: true, email_boleto: true },
  })
  const clientByCnpj = new Map(clients.map(c => [c.cnpj.replace(/\D/g, ''), c]))

  // Delete existing sends for this campaign
  await prisma.campaignSend.deleteMany({ where: { campaign_id: campaignId } })

  // Create sends
  const sends: any[] = []
  for (const [cnpj, pages] of cnpjPages.entries()) {
    const client = clientByCnpj.get(cnpj)
    const emails: string[] = []
    if (client) {
      if (client.email_nfe) emails.push(client.email_nfe)
      else if (client.email) emails.push(client.email)
    }
    const boletoPgs = bolCnpjPage.has(cnpj) ? [bolCnpjPage.get(cnpj)!] : []

    sends.push({
      campaign_id:  campaignId,
      client_cnpj:  cnpj,
      client_name:  client?.name ?? cnpj,
      emails,
      nf_pages:     pages,          // 1-indexed page numbers
      boleto_pages: boletoPgs,
      status: emails.length > 0 ? 'PENDING' : 'NO_EMAIL',
    })
  }

  // Also add CNPJs found only in boleto (not in NF)
  for (const [cnpj] of bolCnpjPage.entries()) {
    if (!cnpjPages.has(cnpj)) {
      const client = clientByCnpj.get(cnpj)
      const emails: string[] = []
      if (client?.email_boleto) emails.push(client.email_boleto)
      else if (client?.email) emails.push(client.email)

      sends.push({
        campaign_id:  campaignId,
        client_cnpj:  cnpj,
        client_name:  client?.name ?? cnpj,
        emails,
        nf_pages:     [],
        boleto_pages: [bolCnpjPage.get(cnpj)!],
        status: emails.length > 0 ? 'PENDING' : 'NO_EMAIL',
      })
    }
  }

  await prisma.campaignSend.createMany({ data: sends })

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'ACTIVE', started_at: new Date() },
  })

  revalidatePath('/campaigns')
  revalidatePath('/financeiro/enviar-cobranca')
  redirect(`/financeiro/enviar-cobranca?campaign=${campaignId}`)
}

// ─── delete campaign ─────────────────────────────────────────────────────────

export async function deleteCampaignAction(campaignId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.orgId) return { error: 'Não autenticado.' }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organization_id: session.user.orgId },
  })
  if (!campaign) return { error: 'Campanha não encontrada.' }

  // Delete files from MinIO
  if (campaign.pdf_nf_key)     await deleteFile(campaign.pdf_nf_key).catch(() => {})
  if (campaign.pdf_boleto_key) await deleteFile(campaign.pdf_boleto_key).catch(() => {})

  await prisma.campaignSend.deleteMany({ where: { campaign_id: campaignId } })
  await prisma.campaign.delete({ where: { id: campaignId } })

  revalidatePath('/campaigns')
  return {}
}
