import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const { login, submitting } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    try {
      await login({ mode, username, password, nickname })
    } catch (submitError) {
      setError(errorMessage(submitError, mode === 'register' ? '注册失败' : '登录失败'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">企业知识库智能问答</div>
        <div className="auth-subtitle">
          登录后可使用知识库问答、文件上传、联网搜索、历史会话和多轮对话功能。
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="authUsername">用户名</label>
            <input
              id="authUsername"
              type="text"
              autoComplete="username"
              placeholder="请输入用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="authPassword">密码</label>
            <input
              id="authPassword"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="请输入密码，至少 6 位"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="authNickname">昵称</label>
              <input
                id="authNickname"
                type="text"
                placeholder="请输入昵称，可不填"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <div className="auth-error">{error}</div>
      </div>
    </div>
  )
}
