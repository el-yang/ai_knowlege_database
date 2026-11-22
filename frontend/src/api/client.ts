import type {
  ApiErrorBody,
  ChatMessageDto,
  ChatSessionSummary,
  CurrentUser,
  LoginResult,
  UploadedFileResult,
} from './types'

export const DEFAULT_KNOWLEDGE_BASE_ID = 1
export const DEFAULT_TOP_K = 3
export const WEB_SEARCH_TOP_K = 20

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

function buildHeaders(token?: string, extra?: HeadersInit, hasJsonBody = false): Headers {
  const headers = new Headers(extra)
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  token?: string
  headers?: HeadersInit
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options

  const response = await fetch(url, {
    ...rest,
    headers: buildHeaders(token, headers, typeof rest.body === 'string'),
  })

  const body = await readJson<T & ApiErrorBody>(response)

  if (!response.ok) {
    const message = body?.message || body?.error || `请求失败，状态码：${response.status}`
    throw new ApiError(message, response.status)
  }

  return body as T
}

export function login(username: string, password: string): Promise<LoginResult> {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register(username: string, password: string, nickname: string): Promise<CurrentUser> {
  return request<CurrentUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, nickname }),
  })
}

export function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return request<CurrentUser>('/api/auth/me', { token })
}

export async function logout(token: string): Promise<void> {
  await request<{ message?: string }>('/api/auth/logout', { method: 'POST', token })
}

export async function uploadFile(
  token: string,
  file: File,
  knowledgeBaseId: number = DEFAULT_KNOWLEDGE_BASE_ID,
): Promise<UploadedFileResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/files/upload?knowledgeBaseId=${knowledgeBaseId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const body = await readJson<UploadedFileResult & ApiErrorBody>(response)

  if (!response.ok) {
    const message =
      body?.message || body?.error || `上传失败，状态码：${response.status}`
    throw new ApiError(message, response.status)
  }

  return body as UploadedFileResult
}

export async function fetchSessions(token: string): Promise<ChatSessionSummary[]> {
  const data = await request<ChatSessionSummary[] | null>('/api/sessions', { token })
  return data ?? []
}

export async function fetchSessionMessages(
  token: string,
  sessionId: string,
): Promise<ChatMessageDto[]> {
  const data = await request<ChatMessageDto[] | null>(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    { token },
  )
  return data ?? []
}

export async function deleteSession(token: string, sessionId: string): Promise<void> {
  await request<{ message?: string }>(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    token,
  })
}

export interface AskStreamParams {
  question: string
  topK: number
  sessionId?: string
  uploadedFileId?: string
  webSearch: boolean
  knowledgeBaseId?: number
}

/**
 * 发起流式问答请求。返回未读取的 Response，由调用方消费 NDJSON 流，
 * 这样调用方可以先判断 401 / 429 之类的状态码。
 */
export function askStream(
  token: string,
  params: AskStreamParams,
  signal?: AbortSignal,
): Promise<Response> {
  const search = new URLSearchParams()
  search.append('knowledgeBaseId', String(params.knowledgeBaseId ?? DEFAULT_KNOWLEDGE_BASE_ID))
  search.append('question', params.question)
  search.append('topK', String(params.topK))

  if (params.sessionId) {
    search.append('sessionId', params.sessionId)
  }
  if (params.uploadedFileId) {
    search.append('uploadedFileId', params.uploadedFileId)
  }
  if (params.webSearch) {
    search.append('webSearch', 'true')
  }

  return fetch(`/api/rag/ask/stream?${search.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
}

export async function readErrorFromResponse(response: Response): Promise<ApiErrorBody | null> {
  return readJson<ApiErrorBody>(response)
}
