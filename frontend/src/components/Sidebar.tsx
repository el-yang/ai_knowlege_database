import type { CurrentUser, ChatSessionSummary } from '../api/types'
import { formatTime } from '../utils/format'

interface SidebarProps {
  user: CurrentUser | null
  sessions: ChatSessionSummary[]
  sessionsLoading: boolean
  sessionsError: string
  activeSessionId: string
  onNewChat: () => void
  onOpenSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onLogout: () => void
}

export function Sidebar({
  user,
  sessions,
  sessionsLoading,
  sessionsError,
  activeSessionId,
  onNewChat,
  onOpenSession,
  onDeleteSession,
  onLogout,
}: SidebarProps) {
  const displayName = user?.nickname || user?.username || '已登录'

  const renderHistory = () => {
    if (sessionsLoading && sessions.length === 0) {
      return <div className="empty-history">正在加载历史会话...</div>
    }

    if (sessions.length === 0) {
      return (
        <div className="empty-history">{sessionsError || '暂无历史会话。'}</div>
      )
    }

    return (
      <>
        {sessionsError && <div className="empty-history">{sessionsError}</div>}
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className={`session-item${session.sessionId === activeSessionId ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpenSession(session.sessionId)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpenSession(session.sessionId)
              }
            }}
          >
            <div className="session-title">{session.title || '未命名会话'}</div>
            <div className="session-meta">
              {`${session.messageCount ?? 0} 条消息 · ${formatTime(session.updateTime)}`}
            </div>
            <button
              type="button"
              className="delete-session"
              title="删除会话"
              onClick={(event) => {
                event.stopPropagation()
                onDeleteSession(session.sessionId)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </>
    )
  }

  return (
    <aside className="sidebar">
      <h1>知识库问答系统</h1>
      <div className="subtitle">企业知识库 RAG 智能问答助手</div>

      <div className="user-box">
        当前用户：
        <div className="user-name">{displayName}</div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          退出登录
        </button>
      </div>

      <button type="button" className="new-chat-btn" onClick={onNewChat}>
        ＋ 新建会话
      </button>

      <div className="history-title">历史会话</div>
      <div className="history-list">{renderHistory()}</div>

      <div className="sidebar-footer">
        支持文档检索增强、联网搜索、历史会话恢复、引用来源展示。
      </div>
    </aside>
  )
}
