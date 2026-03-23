'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { uploadFile, deleteFile, buildKey } from '@/lib/storage'
import { extrairCnpjDaPagina, extrairCnpjBoleto } from '@/lib/pdf-extractor'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── helpers ────────────────────────────────────────────────────────────────

function monthYearToLabel(iso: string): string {
  // iso = "2026-03"  →  "03/2026"
  const [y, m] = iso.split('-')
  return `${m}/${y}`
}

async function parsePdfPages(buffer: Buffer): Promise<string[]> {
  // Lazy require so pdf-parse is not evaluated at build/module-load time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const pages: string[] = []
  await pdfParse(buffer, {
    pagerender(pageData: any) {
      return pageData.getTextContent().then((content: any) => {
        const text = content.items.map((i: any) => i.str).join(' ')
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

  const nfBuffer = await fetchBuffer(campaign.pdf_nf_key)
  const nfPages  = await parsePdfPages(nfBuffer)

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
  if (campaign.pdf_boleto_key) {
    const bolBuffer = await fetchBuffer(campaign.pdf_boleto_key)
    const bolPages  = await parsePdfPages(bolBuffer)
    bolPages.forEach((text, idx) => {
      const cnpj = extrairCnpjBoleto(text, cnpjsIgnore)
      if (cnpj && !bolCnpjPage.has(cnpj)) bolCnpjPage.set(cnpj, idx + 1)
    })
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

    sends.push({
      campaign_id: campaignId,
      client_cnpj: cnpj,
      client_name: client?.name ?? cnpj,
      emails,
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
        campaign_id: campaignId,
        client_cnpj: cnpj,
        client_name: client?.name ?? cnpj,
        emails,
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
