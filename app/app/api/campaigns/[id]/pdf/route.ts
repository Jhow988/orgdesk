import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.orgId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: campaignId } = await params
  const cnpj = req.nextUrl.searchParams.get('cnpj')
  const type = req.nextUrl.searchParams.get('type') // 'nf' | 'boleto'

  if (!cnpj || !type) return NextResponse.json({ error: 'Parâmetros ausentes.' }, { status: 400 })

  const campaign = await adminPrisma.campaign.findFirst({
    where: { id: campaignId, organization_id: session.user.orgId },
  })
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 })

  const send = await adminPrisma.campaignSend.findFirst({
    where: { campaign_id: campaignId, client_cnpj: cnpj },
  })
  if (!send) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })

  const isNf = type === 'nf'
  const pdfKey   = isNf ? campaign.pdf_nf_key : campaign.pdf_boleto_key
  const pages    = isNf ? send.nf_pages : send.boleto_pages

  if (!pdfKey) return NextResponse.json({ error: 'PDF não disponível.' }, { status: 404 })
  if (!pages || pages.length === 0) return NextResponse.json({ error: 'Sem páginas para este tipo.' }, { status: 404 })

  let sourceBuffer: Buffer
  try {
    sourceBuffer = await fetchBuffer(pdfKey)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar PDF do storage.' }, { status: 500 })
  }

  // Extract specific pages (1-indexed)
  const sourcePdf = await PDFDocument.load(sourceBuffer)
  const outPdf    = await PDFDocument.create()
  const indices   = pages.map((p: number) => p - 1).filter((i: number) => i >= 0 && i < sourcePdf.getPageCount())
  const copied    = await outPdf.copyPages(sourcePdf, indices)
  copied.forEach((p: any) => outPdf.addPage(p))

  const outBytes = await outPdf.save()
  const buffer   = Buffer.from(outBytes)

  const filename = isNf
    ? `NF_${cnpj}_${campaign.month_year}.pdf`
    : `Boleto_${cnpj}_${campaign.month_year}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
