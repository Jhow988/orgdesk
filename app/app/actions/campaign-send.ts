'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ─── PDF helpers (lazy to avoid bundling issues) ─────────────────────────────

async function fetchPdfBuffer(key: string): Promise<Buffer> {
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
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.MINIO_BUCKET!, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function extractPages(pdfBuffer: Buffer, pages: number[]): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(pdfBuffer)
  const out = await PDFDocument.create()
  for (const pageNum of pages) {
    const idx = pageNum - 1 // convert 1-indexed to 0-indexed
    if (idx >= 0 && idx < src.getPageCount()) {
      const [page] = await out.copyPages(src, [idx])
      out.addPage(page)
    }
  }
  return Buffer.from(await out.save())
}

// ─── Email ───────────────────────────────────────────────────────────────────

function bodyToHtmlParagraphs(text: string): string {
  return text
    .split(/\n\n+/)
    .map(block => {
      const lines = block
        .split('\n')
        .map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br>')
      return `<p style="margin:0 0 12px 0">${lines}</p>`
    })
    .join('')
}

function buildEmailHtmlFromTemplate(
  templateBody: string,
  vars: { nome_cliente: string; mes_ano: string; link_portal: string },
  pixelUrl: string,
): string {
  const rendered = templateBody
    .replace(/\{nome_cliente\}/g, vars.nome_cliente)
    .replace(/\{mes_ano\}/g,      vars.mes_ano)
    .replace(/\{link_portal\}/g,  vars.link_portal)

  const bodyHtml = bodyToHtmlParagraphs(rendered)

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.08);overflow:hidden;max-width:600px;width:100%">
  <tr><td style="background:#1a2e4a;padding:22px 32px">
    <p style="margin:0;color:#fff;font-size:19px;font-weight:700;letter-spacing:.3px">Syall Soluções</p>
    <p style="margin:3px 0 0;color:#93adc8;font-size:12px">Departamento Financeiro</p>
  </td></tr>
  <tr><td style="padding:28px 32px;color:#374151;font-size:14px;line-height:1.7">
    ${bodyHtml}
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Este e-mail foi gerado automaticamente pelo sistema OrgDesk.
  </td></tr>
</table>
</td></tr></table>
<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt="">
</body></html>`
}

async function sendEmail(opts: {
  to:              string[]
  nome:            string
  mesAno:          string
  portalUrl:       string
  templateSubject: string
  templateBody:    string
  nfBuffer:        Buffer
  nfFilename:      string
  boletoBuffer?:   Buffer
  boletoFilename?: string
  pixelId:         string
}) {
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!,
    port:   parseInt(process.env.SMTP_PORT ?? '465'),
    secure: (process.env.SMTP_PORT ?? '465') === '465',
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  })

  const baseUrl  = process.env.NEXTAUTH_URL ?? 'https://orgdesk.com.br'
  const pixelUrl = `${baseUrl}/api/track/${opts.pixelId}`

  // Replace variables in subject and body
  const subject = opts.templateSubject
    .replace(/\{nome_cliente\}/g, opts.nome)
    .replace(/\{mes_ano\}/g,      opts.mesAno)
    .replace(/\{link_portal\}/g,  opts.portalUrl)

  const html = buildEmailHtmlFromTemplate(
    opts.templateBody,
    { nome_cliente: opts.nome, mes_ano: opts.mesAno, link_portal: opts.portalUrl },
    pixelUrl,
  )

  // Plain-text fallback
  const text = opts.templateBody
    .replace(/\{nome_cliente\}/g, opts.nome)
    .replace(/\{mes_ano\}/g,      opts.mesAno)
    .replace(/\{link_portal\}/g,  opts.portalUrl)

  const attachments: any[] = [
    { filename: opts.nfFilename, content: opts.nfBuffer, contentType: 'application/pdf' },
  ]
  if (opts.boletoBuffer) {
    attachments.push({ filename: opts.boletoFilename, content: opts.boletoBuffer, contentType: 'application/pdf' })
  }

  await transporter.sendMail({
    from: `"Syall Soluções - Financeiro" <${process.env.SMTP_USER}>`,
    to:   opts.to.join(', '),
    subject,
    text,
    html,
    attachments,
  })
}

// ─── Main action ──────────────────────────────────────────────────────────────

import { DEFAULT_SUBJECT, DEFAULT_BODY } from './email-templates-defaults'

export async function enviarSendsAction(
  sendIds:    string[],
  templateId: string | null = null,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const session = await auth()
  if (!session?.user?.orgId) return { ok: false, error: 'Não autenticado.' }
  if (!sendIds.length)        return { ok: false, error: 'Nenhum registro selecionado.' }

  // Fetch sends with campaign info
  const sends = await prisma.campaignSend.findMany({
    where: {
      id: { in: sendIds },
      campaign: { organization_id: session.user.orgId },
      status: { in: ['PENDING', 'FAILED'] },
    },
    include: {
      campaign: { select: { label: true, month_year: true, pdf_nf_key: true, pdf_boleto_key: true } },
    },
  })

  if (!sends.length) return { ok: false, error: 'Nenhum registro pendente encontrado.' }

  // Fetch email template (from DB or use default)
  let templateSubject = DEFAULT_SUBJECT
  let templateBody    = DEFAULT_BODY
  if (templateId) {
    const tpl = await prisma.emailTemplate.findFirst({
      where: { id: templateId, organization_id: session.user.orgId },
    })
    if (tpl) { templateSubject = tpl.subject; templateBody = tpl.body }
  }

  // Pre-fetch portal tokens for all clients in this batch
  const cnpjs = [...new Set(sends.map(s => s.client_cnpj))]
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://orgdesk.com.br'
  type TokenRow = { cnpj: string; portal_token: string | null }
  const tokenRows = cnpjs.length > 0
    ? await prisma.$queryRaw<TokenRow[]>`
        SELECT cnpj, portal_token FROM clients
        WHERE organization_id = ${session.user.orgId}
          AND cnpj = ANY(${cnpjs}::text[])
      `
    : []
  const portalTokenMap = new Map(tokenRows.map(r => [r.cnpj, r.portal_token]))

  // Group sends by campaign to fetch PDFs once per campaign
  const campaignBuffers = new Map<string, { nf: Buffer; boleto?: Buffer }>()

  for (const send of sends) {
    const campId = send.campaign_id
    if (!campaignBuffers.has(campId)) {
      const nfBuffer = send.campaign.pdf_nf_key
        ? await fetchPdfBuffer(send.campaign.pdf_nf_key)
        : null
      const boletoBuffer = send.campaign.pdf_boleto_key
        ? await fetchPdfBuffer(send.campaign.pdf_boleto_key).catch(() => undefined)
        : undefined
      if (nfBuffer) campaignBuffers.set(campId, { nf: nfBuffer, boleto: boletoBuffer })
    }
  }

  let successCount = 0

  for (const send of sends) {
    const buffers = campaignBuffers.get(send.campaign_id)
    if (!buffers) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', error_msg: 'PDF da campanha não encontrado.' },
      })
      continue
    }

    if (send.emails.length === 0) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'NO_EMAIL' },
      })
      continue
    }

    try {
      // Extract client-specific PDF pages
      const nfBuffer = send.nf_pages.length > 0
        ? await extractPages(buffers.nf, send.nf_pages)
        : buffers.nf

      const boletoBuffer = (send.boleto_pages.length > 0 && buffers.boleto)
        ? await extractPages(buffers.boleto, send.boleto_pages)
        : undefined

      const mesAno  = send.campaign.label
      const mesSlug = send.campaign.month_year.replace('-', '')
      const pixelId = crypto.randomBytes(12).toString('base64url')
      const token   = portalTokenMap.get(send.client_cnpj)
      const portalUrl = token ? `${baseUrl}/c/${token}` : baseUrl

      await sendEmail({
        to:              send.emails,
        nome:            send.client_name,
        mesAno,
        portalUrl,
        templateSubject,
        templateBody,
        nfBuffer,
        nfFilename:      `NF_${send.client_cnpj}_${mesSlug}.pdf`,
        boletoBuffer,
        boletoFilename:  boletoBuffer ? `Boleto_${send.client_cnpj}_${mesSlug}.pdf` : undefined,
        pixelId,
      })

      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'SENT', sent_at: new Date(), pixel_id: pixelId, error_msg: null },
      })
      successCount++
    } catch (err: any) {
      await prisma.campaignSend.update({
        where: { id: send.id },
        data: { status: 'FAILED', error_msg: String(err?.message ?? err).slice(0, 500) },
      })
    }
  }

  revalidatePath('/financeiro/enviar-cobranca')
  return { ok: true, count: successCount }
}
