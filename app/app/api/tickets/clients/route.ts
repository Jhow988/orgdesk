import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clients = await prisma.client.findMany({
    where:   { organization_id: session.user.orgId },
    select:  { id: true, name: true, cnpj: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(clients)
}
