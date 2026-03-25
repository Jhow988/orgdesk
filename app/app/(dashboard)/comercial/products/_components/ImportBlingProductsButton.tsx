'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { syncProductsAction } from '@/app/actions/bling'

export function ImportBlingProductsButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleClick() {
    startTransition(async () => {
      const res = await syncProductsAction()
      if (res.error) {
        setResult(`Erro: ${res.error}`)
      } else {
        setResult(`${res.upserted} produto(s) importado(s)${res.errors ? ` · ${res.errors} erro(s)` : ''}`)
        router.refresh()
      }
      setTimeout(() => setResult(null), 4000)
    })
  }

  return (
    <>
      {result && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-indigo-700 bg-indigo-900/80 px-4 py-2 text-sm text-indigo-300 shadow-lg backdrop-blur">
          {result}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
        {isPending ? 'Importando…' : 'Importar do Bling'}
      </button>
    </>
  )
}
