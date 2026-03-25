import { PortalGate } from './_components/PortalGate'

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <PortalGate token={token} />
}
