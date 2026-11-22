import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../api/types'
import { MessageBubble } from './MessageBubble'

export function ChatArea({ messages }: { messages: ChatMessage[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  return (
    <div className="chat-container" ref={containerRef}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}
