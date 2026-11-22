import { useEffect, useRef } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import type { Attachment } from '../hooks/useChat'

const ACCEPTED_TYPES = '.txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.bmp'
const MAX_TEXTAREA_HEIGHT = 180

interface ComposerProps {
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  sending: boolean
  uploading: boolean
  webSearch: boolean
  onToggleWebSearch: () => void
  attachment: Attachment | null
  onSelectFile: (file: File) => void
  onClearAttachment: () => void
  textareaRef: RefObject<HTMLTextAreaElement>
}

export function Composer({
  draft,
  onDraftChange,
  onSend,
  onStop,
  sending,
  uploading,
  webSearch,
  onToggleWebSearch,
  attachment,
  onSelectFile,
  onClearAttachment,
  textareaRef,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 输入内容变化时自适应高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [draft, textareaRef])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文输入法选词时不响应回车
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      const textarea = event.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      onDraftChange(`${draft.slice(0, start)}\n${draft.slice(end)}`)

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1
        textarea.selectionEnd = start + 1
      })
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!sending && !uploading) {
        onSend()
      }
    }
  }

  const canSend = !uploading && draft.trim().length > 0

  return (
    <div className="input-area">
      <div className="composer">
        <div className="composer-status">
          {uploading && <div className="status-pill uploading">正在上传并解析文件...</div>}

          {!uploading && attachment && (
            <>
              <div className="status-pill file">
                <span>{`当前文件：${attachment.name}`}</span>
                <button
                  type="button"
                  className="status-close"
                  title="取消当前文件"
                  onClick={onClearAttachment}
                >
                  ×
                </button>
              </div>
              <div className="status-pill">将优先回答该文件内容</div>
            </>
          )}

          {!uploading && !attachment && webSearch && (
            <div className="status-pill">联网搜索已开启</div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          className="question-input"
          placeholder="给 AI 发送消息，例如：这篇论文是否已经正式发表？"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="composer-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              className={`tool-btn${webSearch ? ' active' : ''}`}
              onClick={onToggleWebSearch}
            >
              {webSearch ? '🌐 联网搜索已开' : '🌐 联网搜索'}
            </button>

            <button
              type="button"
              className="tool-btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              📎 上传资料
            </button>

            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) {
                  onSelectFile(file)
                }
              }}
            />
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              className={`send-btn${sending ? ' stop' : ''}`}
              title={sending ? '停止生成' : '发送'}
              disabled={sending ? false : !canSend}
              onClick={sending ? onStop : onSend}
            >
              {sending ? '■' : '↑'}
            </button>
          </div>
        </div>
      </div>

      <div className="tips">
        Enter 发送，Ctrl + Enter 换行。若已指定上传文件，将优先回答文件内容；取消文件后才会使用联网搜索。
      </div>
    </div>
  )
}
