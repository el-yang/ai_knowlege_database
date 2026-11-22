import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ChatArea } from '../components/ChatArea'
import { Composer } from '../components/Composer'
import { Sidebar } from '../components/Sidebar'
import { useChat } from '../hooks/useChat'

export function ChatPage() {
  const { user, logout } = useAuth()
  const {
    messages,
    draft,
    setDraft,
    sessionId,
    sessions,
    sessionsLoading,
    sessionsError,
    attachment,
    webSearch,
    sending,
    uploading,
    send,
    stopSending,
    toggleWebSearch,
    uploadSelectedFile,
    clearAttachment,
    newChat,
    openSession,
    deleteSession,
  } = useChat()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 回答结束后把焦点还给输入框，方便连续追问
  useEffect(() => {
    if (!sending) {
      textareaRef.current?.focus()
    }
  }, [sending])

  const handleNewChat = () => {
    newChat()
    textareaRef.current?.focus()
  }

  return (
    <div className="app-page">
      <Sidebar
        user={user}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        sessionsError={sessionsError}
        activeSessionId={sessionId}
        onNewChat={handleNewChat}
        onOpenSession={openSession}
        onDeleteSession={deleteSession}
        onLogout={logout}
      />

      <main className="main">
        <div className="header">
          <div className="header-title">企业知识库智能问答</div>
          <div className="header-desc">上传资料、联网搜索和提问都在底部输入框完成</div>
        </div>

        <ChatArea messages={messages} />

        <Composer
          draft={draft}
          onDraftChange={setDraft}
          onSend={send}
          onStop={stopSending}
          sending={sending}
          uploading={uploading}
          webSearch={webSearch}
          onToggleWebSearch={toggleWebSearch}
          attachment={attachment}
          onSelectFile={uploadSelectedFile}
          onClearAttachment={clearAttachment}
          textareaRef={textareaRef}
        />
      </main>
    </div>
  )
}
