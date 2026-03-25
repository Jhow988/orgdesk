import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listEmailTemplatesAction } from '@/app/actions/email-templates'
import { EmailTemplatesManager } from './_components/EmailTemplatesManager'

export default async function EmailSettingsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const templates = await listEmailTemplatesAction()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Perfil de E-mail</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os templates de e-mail usados nos envios.
        </p>
      </div>

      <EmailTemplatesManager templates={templates} />
    </div>
  )
}
