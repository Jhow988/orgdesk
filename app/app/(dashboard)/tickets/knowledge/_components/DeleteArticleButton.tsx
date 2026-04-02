'use client'

import { Trash2 } from 'lucide-react'
import { deleteArticleAction } from '@/app/actions/knowledge'

export function DeleteArticleButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm('Excluir este artigo?')) return
    await deleteArticleAction(id)
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors">
      <Trash2 size={12} />
    </button>
  )
}
