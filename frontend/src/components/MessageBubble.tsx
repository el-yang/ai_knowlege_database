import { useRef, useState } from 'react'
import type { ChatMessage, RagSource, WebSource } from '../api/types'
import { formatScore } from '../utils/format'

function isWebSource(source: RagSource): source is WebSource {
  return typeof (source as WebSource).url === 'string' && Boolean((source as WebSource).url)
}

function SourcesPanel({ sources }: { sources: RagSource[] }) {
  const [expanded, setExpanded] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)

    // 展开后把来源区域滚到可见位置，避免被底部输入框挡住
    if (next) {
      requestAnimationFrame(() => {
        boxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
  }

  return (
    <>
      <button type="button" className="source-toggle" onClick={toggle}>
        {`${expanded ? '▼' : '▶'} 引用来源（${sources.length} 条，点击${expanded ? '收起' : '展开'}）`}
      </button>

      <div className={`source-box${expanded ? ' expanded' : ''}`} ref={boxRef}>
        {sources.map((source, index) => {
          if (isWebSource(source)) {
            return (
              <div className="source-content" key={`web_${index}`}>
                <a
                  className="source-link"
                  href={source.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {`【网页来源 ${index + 1}】${source.title || source.url}`}
                </a>
                <div>
                  {`链接：${source.url}\n` +
                    `相关性分数：${formatScore(source.score)}` +
                    (source.publishedDate ? `\n发布时间：${source.publishedDate}` : '') +
                    `\n\n${source.content ?? ''}`}
                </div>
              </div>
            )
          }

          return (
            <div className="source-content" key={`chunk_${index}`}>
              {`【知识片段 ${index + 1}】距离：${formatScore(source.distance)}\n${source.content ?? ''}`}
            </div>
          )
        })}
      </div>
    </>
  )
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const thinking = message.streaming && !message.content
  const hasSources = Boolean(message.sources && message.sources.length > 0)

  return (
    <div className={`message-row ${message.role}`}>
      <div
        className={`message ${message.role}${message.failed ? ' failed' : ''}`}
        aria-live={message.role === 'assistant' ? 'polite' : undefined}
      >
        {thinking ? (
          <span className="loading">正在思考中...</span>
        ) : (
          message.content
        )}
        {hasSources && <SourcesPanel sources={message.sources ?? []} />}
      </div>
    </div>
  )
}
