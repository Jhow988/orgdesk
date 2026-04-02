'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { useState, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Link2, ImageIcon,
  Youtube as YoutubeIcon, Code, Code2, Undo, Redo,
  Heading1, Heading2, Heading3, IndentIcon,
} from 'lucide-react'

const btn = (active = false) =>
  `p-1.5 rounded text-xs transition-colors ${
    active
      ? 'bg-indigo-600 text-white'
      : 'text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200'
  }`

const sep = 'w-px h-4 bg-white/[0.1] mx-0.5 self-center'

function ToolbarButton({
  onClick, active = false, title, children, disabled = false,
}: {
  onClick: () => void; active?: boolean; title: string
  children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button type="button" title={title} disabled={disabled}
      onClick={onClick}
      className={`${btn(active)} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  )
}

interface RichEditorProps {
  name: string
  defaultValue?: string
}

export function RichEditor({ name, defaultValue = '' }: RichEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false)
  const [rawHtml, setRawHtml] = useState(defaultValue)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: 'bg-zinc-800 text-zinc-200 rounded p-3 font-mono text-xs' } } }),
      Underline,
      TextStyle,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-400 underline' } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-2' } }),
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: 'rounded-lg my-2 w-full aspect-video' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: 'min-h-[280px] px-4 py-3 text-sm text-zinc-200 leading-relaxed focus:outline-none prose prose-invert prose-sm max-w-none',
      },
    },
  })

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL do link:')
    if (!url) return
    if (url === '') {
      editor.chain().focus().extendMarkToLink({ href: '' }).unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL da imagem:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const addYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL do vídeo (YouTube):')
    if (url) editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  const toggleHtmlMode = () => {
    if (!editor) return
    if (!htmlMode) {
      setRawHtml(editor.getHTML())
      setHtmlMode(true)
    } else {
      editor.commands.setContent(rawHtml, false)
      setHtmlMode(false)
    }
  }

  if (!editor) return null

  const currentHtml = htmlMode ? rawHtml : editor.getHTML()

  return (
    <div className="rounded-md border border-white/[0.1] bg-white/[0.04] overflow-hidden focus-within:border-white/20">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={currentHtml} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.08] bg-white/[0.03]">
        {/* Undo / Redo */}
        <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={13} />
        </ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* Headings */}
        <ToolbarButton title="Título 1" active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={13} />
        </ToolbarButton>
        <ToolbarButton title="Título 2" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={13} />
        </ToolbarButton>
        <ToolbarButton title="Título 3" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* Formatting */}
        <ToolbarButton title="Negrito" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton title="Itálico" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton title="Tachado" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton title="Código inline" active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* Alignment */}
        <ToolbarButton title="Alinhar à esquerda" active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={13} />
        </ToolbarButton>
        <ToolbarButton title="Centralizar" active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={13} />
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={13} />
        </ToolbarButton>
        <ToolbarButton title="Justificar" active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* Lists */}
        <ToolbarButton title="Lista com marcadores" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton title="Bloco de citação" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={13} />
        </ToolbarButton>
        <ToolbarButton title="Bloco de código" active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 size={13} />
        </ToolbarButton>
        <ToolbarButton title="Linha horizontal"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* Insert */}
        <ToolbarButton title="Inserir link" active={editor.isActive('link')} onClick={addLink}>
          <Link2 size={13} />
        </ToolbarButton>
        <ToolbarButton title="Inserir imagem (URL)" onClick={addImage}>
          <ImageIcon size={13} />
        </ToolbarButton>
        <ToolbarButton title="Inserir vídeo do YouTube" onClick={addYoutube}>
          <YoutubeIcon size={13} />
        </ToolbarButton>

        <div className={sep} />

        {/* HTML mode toggle */}
        <button type="button" title="Editar HTML" onClick={toggleHtmlMode}
          className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
            htmlMode ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300'
          }`}>
          {'</>'}
        </button>
      </div>

      {/* Editor area */}
      {htmlMode ? (
        <textarea
          value={rawHtml}
          onChange={e => setRawHtml(e.target.value)}
          rows={16}
          className="w-full bg-transparent px-4 py-3 text-xs font-mono text-amber-300 leading-relaxed resize-y focus:outline-none"
          placeholder="<p>HTML aqui...</p>"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  )
}
