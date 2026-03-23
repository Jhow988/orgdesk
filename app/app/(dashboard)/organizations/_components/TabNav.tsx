'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'dados', label: 'Dados' },
  { key: 'assinatura', label: 'Assinatura' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'uso', label: 'Uso' },
]

export function TabNav({ orgId }: { orgId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'dados'

  return (
    <div className="flex border-b border-white/[0.08]">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`${pathname}?tab=${tab.key}`}
          className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.key
              ? 'border-zinc-300 text-zinc-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
