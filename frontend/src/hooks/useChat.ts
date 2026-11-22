import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import * as api from '../api/client'
import { consumeNdjsonStream } from '../api/stream'
import type { ChatMessage, ChatSessionSummary, RagSource } from '../api/types'
import { createMessageId } from '../utils/format'
import { STORAGE_BASE, scopedKey } from '../utils/storage'

export interface Attachment {
  id: string
  name: string
}

const WELCOME_TEXT =
  '你好，我是企业知识库智能问答助手。你可以直接提问，也可以在下方开启联网搜索或上传资料后再问。'

const NEW_SESSION_TEXT =
  '已开启新会话。你可以重新开始提问，也可以先上传资料或开启联网搜索。'

const EMPTY_SESSION_TEXT = '该会话暂无消息。'

function welcomeMessages(text: string = WELCOME_TEXT): ChatMessage[] {
  return [{ id: createMessageId(), role: 'assistant', content: text }]
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function useChat() {
  const { user, token, expireSession } = useAuth()

  const keys = useMemo(
    () => ({
      sessionId: scopedKey(STORAGE_BASE.sessionId, user),
      uploadedFileId: scopedKey(STORAGE_BASE.uploadedFileId, user),
      uploadedFileName: scopedKey(STORAGE_BASE.uploadedFileName, user),
      webSearchEnabled: scopedKey(STORAGE_BASE.webSearchEnabled, user),
    }),
    [user],
  )

  const [messages, setMessages] = useState<ChatMessage[]>(() => welcomeMessages())
  const [draft, setDraft] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [webSearch, setWebSearch] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const sendingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const appendAssistantMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: createMessageId(), role: 'assistant', content: text }])
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      setSessionsError('')
      const data = await api.fetchSessions(token)
      setSessions(data)
    } catch (error) {
      if (api.isUnauthorized(error)) {
        expireSession()
        return
      }
      setSessionsError(api.errorMessage(error, '加载历史会话失败'))
    } finally {
      setSessionsLoading(false)
    }
  }, [token, expireSession])

  const openSession = useCallback(
    async (targetSessionId: string) => {
      if (!targetSessionId || sendingRef.current) {
        return
      }

      try {
        const data = await api.fetchSessionMessages(token, targetSessionId)

        setSessionId(targetSessionId)
        localStorage.setItem(keys.sessionId, targetSessionId)

        if (data.length === 0) {
          setMessages(welcomeMessages(EMPTY_SESSION_TEXT))
          return
        }

        setMessages(
          data.map((message, index) => ({
            id: `${targetSessionId}_${message.id ?? index}`,
            role: message.role === 'USER' ? 'user' : 'assistant',
            content: message.content ?? '',
          })),
        )
      } catch (error) {
        if (api.isUnauthorized(error)) {
          expireSession()
          return
        }
        appendAssistantMessage(api.errorMessage(error, '加载会话消息失败'))
      }
    },
    [token, keys.sessionId, expireSession, appendAssistantMessage],
  )

  // 首次进入时恢复本地状态（会话、已上传文件、联网搜索开关）
  useEffect(() => {
    const storedSessionId = localStorage.getItem(keys.sessionId) ?? ''
    const storedFileId = localStorage.getItem(keys.uploadedFileId) ?? ''
    const storedFileName = localStorage.getItem(keys.uploadedFileName) ?? ''
    const storedWebSearch = localStorage.getItem(keys.webSearchEnabled) === 'true'

    setWebSearch(storedWebSearch)
    setAttachment(
      storedFileId
        ? { id: storedFileId, name: storedFileName || `文件 ID ${storedFileId}` }
        : null,
    )

    void loadSessions()

    if (storedSessionId) {
      void openSession(storedSessionId)
    } else {
      setSessionId('')
    }
    // keys 变化即代表切换了账号，需要重新恢复该账号的本地状态
  }, [keys, loadSessions, openSession])

  const toggleWebSearch = useCallback(() => {
    setWebSearch((prev) => {
      const next = !prev
      localStorage.setItem(keys.webSearchEnabled, String(next))
      return next
    })
  }, [keys.webSearchEnabled])

  const newChat = useCallback(() => {
    if (sendingRef.current) {
      return
    }

    setSessionId('')
    localStorage.removeItem(keys.sessionId)
    setMessages(welcomeMessages(NEW_SESSION_TEXT))
  }, [keys.sessionId])

  const deleteSession = useCallback(
    async (targetSessionId: string) => {
      if (!targetSessionId) {
        return
      }

      const confirmed = window.confirm('确定要删除这个会话吗？删除后无法恢复。')
      if (!confirmed) {
        return
      }

      try {
        await api.deleteSession(token, targetSessionId)

        if (targetSessionId === sessionId) {
          setSessionId('')
          localStorage.removeItem(keys.sessionId)
          setMessages(welcomeMessages(NEW_SESSION_TEXT))
        }

        await loadSessions()
      } catch (error) {
        if (api.isUnauthorized(error)) {
          expireSession()
          return
        }
        setSessionsError(api.errorMessage(error, '删除会话失败'))
      }
    },
    [token, sessionId, keys.sessionId, loadSessions, expireSession],
  )

  const clearAttachment = useCallback(() => {
    setAttachment(null)
    localStorage.removeItem(keys.uploadedFileId)
    localStorage.removeItem(keys.uploadedFileName)
    appendAssistantMessage(
      '已取消当前指定文件。后续问题将默认从全部知识库中检索；若开启联网搜索，则会联网搜索。',
    )
  }, [keys.uploadedFileId, keys.uploadedFileName, appendAssistantMessage])

  const uploadSelectedFile = useCallback(
    async (file: File) => {
      if (!file || uploading) {
        return
      }

      setUploading(true)
      try {
        const data = await api.uploadFile(token, file, api.DEFAULT_KNOWLEDGE_BASE_ID)

        if (data.fileId) {
          const nextAttachment: Attachment = {
            id: String(data.fileId),
            name: data.filename || file.name,
          }
          setAttachment(nextAttachment)
          localStorage.setItem(keys.uploadedFileId, nextAttachment.id)
          localStorage.setItem(keys.uploadedFileName, nextAttachment.name)
        }

        appendAssistantMessage(
          `文件“${data.filename || file.name}”已加入知识库，并已设为当前问答文件。你可以直接问：总结一下这个文件。`,
        )
      } catch (error) {
        if (api.isUnauthorized(error)) {
          expireSession()
          return
        }
        appendAssistantMessage(`上传失败：${api.errorMessage(error, '未知错误')}`)
      } finally {
        setUploading(false)
      }
    },
    [uploading, token, keys.uploadedFileId, keys.uploadedFileName, expireSession, appendAssistantMessage],
  )

  const stopSending = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const send = useCallback(async () => {
    if (sendingRef.current) {
      return
    }

    const question = draft.trim()
    if (!question) {
      return
    }

    const assistantId = createMessageId()
    const attachedFileId = attachment?.id ?? ''
    const useWebSearch = webSearch
    const currentSessionId = sessionId

    setDraft('')
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: 'user', content: question },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])

    sendingRef.current = true
    setSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    let answerText = ''
    let receivedSources: RagSource[] | undefined
    let failed = false

    const patchAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((message) => (message.id === assistantId ? { ...message, ...patch } : message)),
      )
    }

    try {
      const response = await api.askStream(
        token,
        {
          question,
          topK: useWebSearch ? api.WEB_SEARCH_TOP_K : api.DEFAULT_TOP_K,
          sessionId: currentSessionId,
          uploadedFileId: attachedFileId,
          webSearch: useWebSearch,
          knowledgeBaseId: api.DEFAULT_KNOWLEDGE_BASE_ID,
        },
        controller.signal,
      )

      if (response.status === 401) {
        expireSession()
        return
      }

      if (!response.ok) {
        const body = await api.readErrorFromResponse(response)
        throw new api.ApiError(
          body?.message || `请求失败，状态码：${response.status}`,
          response.status,
        )
      }

      await consumeNdjsonStream(response, {
        onSessionId: (nextSessionId) => {
          setSessionId(nextSessionId)
          localStorage.setItem(keys.sessionId, nextSessionId)
        },
        onDelta: (text) => {
          answerText += text
          patchAssistant({ content: answerText, streaming: true })
        },
        onSources: (sources) => {
          receivedSources = sources
          patchAssistant({ sources })
        },
        onError: (message) => {
          failed = true
          answerText = message
          patchAssistant({ content: message, streaming: false, failed: true })
        },
      })

      if (!answerText && !failed) {
        patchAssistant({ content: '未获取到回答，请稍后重新提问。', streaming: false })
      } else if (!failed) {
        patchAssistant({ streaming: false, sources: receivedSources })
      }

      await loadSessions()
    } catch (error) {
      if (isAbortError(error)) {
        patchAssistant({
          content: answerText || '已停止生成。',
          streaming: false,
        })
      } else if (api.isUnauthorized(error)) {
        expireSession()
      } else {
        patchAssistant({
          content: `请求失败：${api.errorMessage(error, '未知错误')}`,
          streaming: false,
          failed: true,
        })
      }
    } finally {
      sendingRef.current = false
      abortRef.current = null
      setSending(false)
    }
  }, [
    draft,
    attachment,
    webSearch,
    sessionId,
    token,
    keys.sessionId,
    expireSession,
    loadSessions,
  ])

  return {
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
    refreshSessions: loadSessions,
  }
}
