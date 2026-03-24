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

function buildEmailHtml(nome: string, mesAno: string, temBoleto: boolean, pixelUrl: string): string {
  const corpo = `Prezado(a) ${nome},

Segue em anexo sua Nota Fiscal referente ao período ${mesAno}.${temBoleto ? '\nCaso esteja cadastrado, segue em anexo seu boleto referente ao mesmo mês.' : ''}

A partir do mês de março de 2026, todos os boletos não terão acréscimos de juros, caso venham a passar a data de vencimento. Entendemos que imprevistos podem acontecer e acreditamos assim melhorar ainda mais nossa parceria.

Se desejar cadastrar nosso PIX para futuros pagamentos, seguem os dados:

BANCO INTER
ALLAN CORREA DA SILVA
PIX/CNPJ: 24.347.456/0001-90

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Jhonatan Oliveira
WhatsApp: (12) 98868-7056
Departamento Financeiro
Syall Soluções
financeiro@syall.com.br`

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
    <p style="margin:0 0 12px 0">Prezado(a) <strong>${nome}</strong>,</p>
    <p style="margin:0 0 12px 0">Segue em anexo sua Nota Fiscal referente ao período <strong>${mesAno}</strong>.</p>
    ${temBoleto ? '<p style="margin:0 0 12px 0">Segue em anexo também o boleto referente ao mesmo mês.</p>' : ''}
    <p style="margin:0 0 12px 0">A partir do mês de março de 2026, todos os boletos não terão acréscimos de juros, caso venham a passar a data de vencimento. Entendemos que imprevistos podem acontecer e acreditamos assim melhorar ainda mais nossa parceria.</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:6px;font-size:13px;line-height:1.8;color:#0c4a6e">
      <strong>Dados para pagamento via PIX:</strong><br>
      BANCO INTER<br>
      ALLAN CORREA DA SILVA<br>
      <span style="font-family:monospace;font-size:14px;font-weight:700;color:#0369a1">PIX/CNPJ: 24.347.456/0001-90</span>
    </div>
    ${temBoleto ? '<div style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;font-size:13px;color:#14532d">📎 <strong>Boleto do mês também anexado neste email.</strong></div>' : ''}
    <p style="margin:0 0 4px 0">Em caso de dúvidas, entre em contato conosco.</p>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.9">
      <span style="color:#374151;font-weight:600">Atenciosamente,</span><br>
      <span style="color:#111827;font-size:14px;font-weight:700">Jhonatan Oliveira</span><br>
      📱 WhatsApp: (12) 98868-7056<br>
      Departamento Financeiro<br>
      <span style="color:#374151;font-weight:600">Syall Soluções</span><br>
      <a href="mailto:financeiro@syall.com.br" style="color:#2563eb;text-decoration:none">financeiro@syall.com.br</a>
    </div>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Este email foi gerado automaticamente pelo sistema OrgDesk.
  </td></tr>
</table>
</td></tr></table>
<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt="">
</body></html>`
}

async function sendEmail(opts: {
  to: string[]
  nome: string
  mesAno: string
  nfBuffer: Buffer
  nfFilename: string
  boletoBuffer?: Buffer
  boletoFilename?: string
  pixelId: string
}) {
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? '465'),
    secure: (process.env.SMTP_PORT ?? '465') === '465',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://orgdesk.com.br'
  const pixelUrl = `${baseUrl}/api/track/${opts.pixelId}`
  const temBoleto = !!opts.boletoBuffer

  const attachments: any[] = [
    { filename: opts.nfFilename, content: opts.nfBuffer, contentType: 'application/pdf' },
  ]
  if (temBoleto && opts.boletoBuffer) {
    attachments.push({ filename: opts.boletoFilename, content: opts.boletoBuffer, contentType: 'application/pdf' })
  }

  await transporter.sendMail({
    from: `"Syall Soluções - Financeiro" <${process.env.SMTP_USER}>`,
    to: opts.to.join(', '),
    subject: `Nota Fiscal - ${opts.mesAno}`,
    text: `Prezado(a) ${opts.nome},\n\nSegue em anexo sua Nota Fiscal referente ao período ${opts.mesAno}.\n\nAtenciosamente,\nJhonatan Oliveira\nDepartamento Financeiro - Syall Soluções`,
    html: buildEmailHtml(opts.nome, opts.mesAno, temBoleto, pixelUrl),
    attachments,
  })
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function enviarSendsAction(
  sendIds: string[]
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

      const mesAno = send.campaign.label // e.g. "03/2026"
      const mesSlug = send.campaign.month_year.replace('-', '') // e.g. "202603"
      const pixelId = crypto.randomBytes(12).toString('base64url')

      await sendEmail({
        to: send.emails,
        nome: send.client_name,
        mesAno,
        nfBuffer,
        nfFilename: `NF_${send.client_cnpj}_${mesSlug}.pdf`,
        boletoBuffer,
        boletoFilename: boletoBuffer ? `Boleto_${send.client_cnpj}_${mesSlug}.pdf` : undefined,
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
