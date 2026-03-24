import { NextRequest, NextResponse } from 'next/server'
import { adminPrisma } from '@/lib/prisma'

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pixelId: string }> }
) {
  const { pixelId } = await params

  try {
    const send = await adminPrisma.campaignSend.findUnique({
      where: { pixel_id: pixelId },
      select: { id: true, open_count: true },
    })

    if (send) {
      await adminPrisma.campaignSend.update({
        where: { id: send.id },
        data: {
          open_count: send.open_count + 1,
          opened_at: send.open_count === 0 ? new Date() : undefined,
        },
      })
    }
  } catch {
    // silently ignore — never fail on tracking
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
