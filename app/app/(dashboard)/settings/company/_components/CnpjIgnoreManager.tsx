'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addCnpjIgnoreAction, removeCnpjIgnoreAction } from '@/app/actions/settings'
import { Trash2, Plus, ShieldOff } from 'lucide-react'

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function CnpjIgnoreManager({ cnpjsIgnore }: { cnpjsIgnore: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    startTransition(async () => {
      const res = await addCnpjIgnoreAction(input)
      if (res.error) { setError(res.error); return }
      setInput('')
      router.refresh()
    })
  }

  function handleRemove(cnpj: string) {
    startTransition(async () => {
      await removeCnpjIgnoreAction(cnpj)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldOff size={14} className="text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-200">CNPJs Ignorados no PDF</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        CNPJs da própria empresa emissora que devem ser ignorados ao processar os PDFs de NFs e boletos.
      </p>

      {/* List */}
      {cnpjsIgnore.length === 0 ? (
        <p className="text-xs text-zinc-600 mb-4">Nenhum CNPJ ignorado cadastrado.</p>
      ) : (
        <div className="mb-4 space-y-1.5">
          {cnpjsIgnore.map(cnpj => (
            <div key={cnpj} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <span className="font-mono text-sm text-zinc-300">{formatCnpj(cnpj)}</span>
              <button
                onClick={() => handleRemove(cnpj)}
                disabled={isPending}
                className="rounded p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                title="Remover"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="00.000.000/0000-00"
          className="flex-1 rounded-md border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-white/20 focus:outline-none font-mono"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600/20 border border-indigo-600/30 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-50 transition-colors"
        >
          <Plus size={13} /> Adicionar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
