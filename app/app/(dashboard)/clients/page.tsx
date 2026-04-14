import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClientsTable } from './_components/ClientsTable'

export default async function ClientsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId

  const clients = await adminPrisma.client.findMany({
    where:   { organization_id: orgId },
    orderBy: { name: 'asc' },
    select: {
      id:                 true,
      cnpj:               true,
      name:               true,
      trade_name:         true,
      email:              true,
      email_boleto:       true,
      phone:              true,
      is_active:          true,
      created_at:         true,
      address_street:     true,
      address_number:     true,
      address_complement: true,
      address_district:   true,
      address_city:       true,
      address_state:      true,
      address_zip:        true,
    },
  })

  return (
    <div className="p-6">
      <ClientsTable
        clients={clients.map(c => ({ ...c, created_at: c.created_at.toISOString() }))}
      />
    </div>
  )
}
