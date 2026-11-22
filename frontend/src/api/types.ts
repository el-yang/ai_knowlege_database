/**
 * 与后端 DTO 对应的类型定义。
 */

export interface CurrentUser {
  userId: number
  username: string
  nickname?: string | null
}

export interface LoginResult extends CurrentUser {
  token: string
}

export interface ChatSessionSummary {
  sessionId: string
  title?: string | null
  messageCount?: number | null
  createTime?: string | null
  updateTime?: string | null
}

export interface ChatMessageDto {
  id?: number | null
  sessionId?: string | null
  role: string
  content?: string | null
  createTime?: string | null
}

/** 知识库检索片段（RagSource） */
export interface KnowledgeSource {
  chunkId?: number | null
  documentId?: number | null
  chunkIndex?: number | null
  distance?: number | null
  content?: string | null
}

/** 联网搜索结果（WebSearchResult） */
export interface WebSource {
  title?: string | null
  url?: string | null
  content?: string | null
  score?: number | null
  publishedDate?: string | null
}

export type RagSource = KnowledgeSource | WebSource

export interface UploadedFileResult {
  fileId: number
  filename?: string | null
  fileType?: string | null
  chunkCount?: number | null
  status?: string | null
  message?: string | null
}

export interface ApiErrorBody {
  message?: string
  error?: string
}

/** 前端内部使用的消息模型 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  streaming?: boolean
  failed?: boolean
}
