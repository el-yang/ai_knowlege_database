import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../api/client'
import type { CurrentUser } from '../api/types'
import { storage } from '../utils/storage'

type AuthStatus = 'checking' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: CurrentUser | null
  token: string
  submitting: boolean
  login: (input: {
    mode: 'login' | 'register'
    username: string
    password: string
    nickname?: string
  }) => Promise<void>
  logout: () => Promise<void>
  /** 后端返回 401 时清理本地登录态 */
  expireSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => storage.readToken())
  const [user, setUser] = useState<CurrentUser | null>(() => storage.readUser())
  const [status, setStatus] = useState<AuthStatus>(() =>
    storage.readToken() ? 'checking' : 'anonymous',
  )
  const [submitting, setSubmitting] = useState(false)

  const expireSession = useCallback(() => {
    storage.clearAuth()
    setToken('')
    setUser(null)
    setStatus('anonymous')
  }, [])

  // 刷新页面时用本地 token 校验登录态
  useEffect(() => {
    const storedToken = storage.readToken()
    if (!storedToken) {
      setStatus('anonymous')
      return
    }

    let cancelled = false

    api
      .fetchCurrentUser(storedToken)
      .then((currentUser) => {
        if (cancelled) {
          return
        }
        storage.writeUser(currentUser)
        setUser(currentUser)
        setToken(storedToken)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) {
          expireSession()
        }
      })

    return () => {
      cancelled = true
    }
  }, [expireSession])

  const login = useCallback(
    async (input: {
      mode: 'login' | 'register'
      username: string
      password: string
      nickname?: string
    }) => {
      const username = input.username.trim()
      const password = input.password
      const nickname = (input.nickname ?? '').trim()

      if (!username || !password) {
        throw new Error('请输入用户名和密码。')
      }

      setSubmitting(true)
      try {
        if (input.mode === 'register') {
          await api.register(username, password, nickname)
        }

        const result = await api.login(username, password)
        const currentUser: CurrentUser = {
          userId: result.userId,
          username: result.username,
          nickname: result.nickname,
        }

        storage.writeToken(result.token)
        storage.writeUser(currentUser)
        setToken(result.token)
        setUser(currentUser)
        setStatus('authenticated')
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    const currentToken = storage.readToken()

    if (currentToken) {
      try {
        await api.logout(currentToken)
      } catch {
        // 退出登录失败不应该阻塞前端清理
      }
    }

    expireSession()
  }, [expireSession])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, token, submitting, login, logout, expireSession }),
    [status, user, token, submitting, login, logout, expireSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用')
  }
  return context
}
