import { NextRequest, NextResponse } from 'next/server'
import { adminPrisma } from '@/lib/prisma'
import { PDFDocument } from 'pdf-lib'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

function buildS3() {
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
  const s3 = buildS3()
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.MINIO_BUCKET!, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const campaignId = req.nextUrl.searchParams.get('campaignId')
  const type       = req.nextUrl.searchParams.get('type') // 'nf' | 'boleto'

  if (!campaignId || !type) {
    return NextResponse.json({ error: 'Parâmetros ausentes.' }, { status: 400 })
  }

  // Validate token — look up client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminPrisma as any
  const client = await db.client.findUnique({
    where:  { portal_token: token },
    select: { cnpj: true },
  }) as { cnpj: string } | null
  if (!client) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })

  // Fetch campaign (no org restriction needed — token is the auth)
  const campaign = await adminPrisma.campaign.findUnique({
    where:  { id: campaignId },
    select: { id: true, month_year: true, pdf_nf_key: true, pdf_boleto_key: true },
  })
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 })

  // Fetch the send record for this client
  const send = await adminPrisma.campaignSend.findFirst({
    where: { campaign_id: campaignId, client_cnpj: client.cnpj },
  })
  if (!send) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })

  const isNf  = type === 'nf'
  const pdfKey = isNf ? campaign.pdf_nf_key : campaign.pdf_boleto_key
  const pages  = isNf ? send.nf_pages : send.boleto_pages

  if (!pdfKey) return NextResponse.json({ error: 'PDF não disponível.' }, { status: 404 })
  if (!pages || pages.length === 0) {
    return NextResponse.json({ error: 'Sem páginas para este tipo.' }, { status: 404 })
  }

  let sourceBuffer: Buffer
  try {
    sourceBuffer = await fetchBuffer(pdfKey)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar PDF.' }, { status: 500 })
  }

  const sourcePdf = await PDFDocument.load(sourceBuffer)
  const outPdf    = await PDFDocument.create()
  const indices   = pages.map((p: number) => p - 1).filter((i: number) => i >= 0 && i < sourcePdf.getPageCount())
  const copied    = await outPdf.copyPages(sourcePdf, indices)
  copied.forEach((p: any) => outPdf.addPage(p))

  const buffer   = Buffer.from(await outPdf.save())
  const filename = isNf
    ? `NF_${client.cnpj}_${campaign.month_year}.pdf`
    : `Boleto_${client.cnpj}_${campaign.month_year}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
