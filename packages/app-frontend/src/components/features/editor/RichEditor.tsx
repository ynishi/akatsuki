/**
 * RichEditor
 * Tiptap-based rich text editor wrapper
 *
 * @example
 * ```typescript
 * // Basic usage
 * <RichEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="Start typing..."
 * />
 *
 * // With toolbar
 * <RichEditor
 *   value={content}
 *   onChange={setContent}
 *   showToolbar={true}
 *   extensions={['bold', 'italic', 'code', 'link']}
 * />
 *
 * // Markdown mode
 * <RichEditor
 *   value={markdown}
 *   onChange={setMarkdown}
 *   mode="markdown"
 * />
 * ```
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useEffect } from 'react'
import { Button } from '../../ui/button'
import {
  Bold,
  Italic,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
} from 'lucide-react'

const lowlight = createLowlight(common)

/**
 * Props for RichEditor component
 */
export interface RichEditorProps {
  /**
   * Editor content (HTML or Markdown)
   */
  value: string

  /**
   * Callback when content changes
   */
  onChange: (value: string) => void

  /**
   * Placeholder text
   * @default 'Start typing...'
   */
  placeholder?: string

  /**
   * Show toolbar
   * @default true
   */
  showToolbar?: boolean

  /**
   * Enabled extensions
   * @default ['bold', 'italic', 'code', 'link', 'heading', 'list', 'quote']
   */
  extensions?: Array<
    | 'bold'
    | 'italic'
    | 'code'
    | 'link'
    | 'heading'
    | 'list'
    | 'quote'
    | 'codeBlock'
  >

  /**
   * Editor mode
   * @default 'html'
   */
  mode?: 'html' | 'markdown'

  /**
   * Read-only mode
   * @default false
   */
  readOnly?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Editor height
   * @default 'auto'
   */
  height?: string

  /**
   * Max height
   */
  maxHeight?: string
}

/**
 * Toolbar component
 */
function Toolbar({ editor }: { editor: Editor }) {
  if (!editor) return null

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded ${isActive ? 'bg-gray-200' : 'hover:bg-gray-100'}`

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
      {/* Text formatting */}
      <div className="flex gap-1 border-r pr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={buttonClass(editor.isActive('code'))}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Headings */}
      <div className="flex gap-1 border-r pr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Lists */}
      <div className="flex gap-1 border-r pr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Quote & Link */}
      <div className="flex gap-1 border-r pr-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass(editor.isActive('blockquote'))}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('URL')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={buttonClass(editor.isActive('link'))}
          title="Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * RichEditor component
 *
 * Lightweight wrapper around Tiptap with sensible defaults
 *
 * Features:
 * - Rich text editing (bold, italic, headings, lists, etc.)
 * - Markdown shortcuts
 * - Syntax highlighting for code blocks
 * - Customizable toolbar
 * - Placeholder support
 */
export function RichEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  showToolbar = true,
  readOnly = false,
  className = '',
  height = 'auto',
  maxHeight,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
  })

  // Sync external changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const editorStyle = {
    height: height !== 'auto' ? height : undefined,
    maxHeight: maxHeight,
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {showToolbar && <Toolbar editor={editor} />}
      <div
        className="prose prose-sm max-w-none p-4 focus-within:outline-none overflow-y-auto"
        style={editorStyle}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
