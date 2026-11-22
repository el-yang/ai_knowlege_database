import type { CurrentUser } from '../api/types'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'current_user'

export const storage = {
  readToken(): string {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  },
  writeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },
  readUser(): CurrentUser | null {
    const text = localStorage.getItem(USER_KEY)
    if (!text) {
      return null
    }
    try {
      return JSON.parse(text) as CurrentUser
    } catch {
      return null
    }
  },
  writeUser(user: CurrentUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

/**
 * 按用户隔离本地存储，避免多个账号在同一浏览器里互相串会话。
 */
export function scopedKey(base: string, user: CurrentUser | null): string {
  const suffix = user && user.userId ? `user_${user.userId}` : 'guest'
  return `${base}_${suffix}`
}

export const STORAGE_BASE = {
  sessionId: 'rag_session_id',
  uploadedFileId: 'latest_uploaded_file_id',
  uploadedFileName: 'latest_uploaded_file_name',
  webSearchEnabled: 'web_search_enabled',
} as const
