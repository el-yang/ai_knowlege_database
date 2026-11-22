import type { RagSource } from './types'

interface StreamEvent {
  type?: string
  data?: unknown
}

export interface StreamHandlers {
  onSessionId?: (sessionId: string) => void
  onDelta?: (text: string) => void
  onSources?: (sources: RagSource[]) => void
  onError?: (message: string) => void
}

/**
 * 逐行解析后端返回的 NDJSON 流。
 * 后端事件格式：{"type":"delta","data":"..."}
 */
export async function consumeNdjsonStream(
  response: Response,
  handlers: StreamHandlers,
): Promise<void> {
  if (!response.body) {
    throw new Error('当前浏览器不支持流式读取。')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }

    let event: StreamEvent
    try {
      event = JSON.parse(trimmed) as StreamEvent
    } catch {
      return
    }

    switch (event.type) {
      case 'sessionId':
        if (typeof event.data === 'string' && event.data) {
          handlers.onSessionId?.(event.data)
        }
        break
      case 'delta':
        handlers.onDelta?.(typeof event.data === 'string' ? event.data : '')
        break
      case 'sources':
        handlers.onSources?.(Array.isArray(event.data) ? (event.data as RagSource[]) : [])
        break
      case 'error':
        handlers.onError?.(typeof event.data === 'string' ? event.data : '流式问答失败。')
        break
      default:
        break
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(handleLine)
  }

  if (buffer.trim()) {
    handleLine(buffer)
  }
}
