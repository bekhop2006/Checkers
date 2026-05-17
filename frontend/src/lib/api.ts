/**
 * Tiny `fetch` wrapper with cookie-based auth.
 *
 * - Always sends credentials so the httpOnly access_token cookie is included.
 * - Throws `ApiError` on non-2xx responses.
 */

import type {
  GameDetail,
  LeaderboardEntry,
  PuzzleAttemptResult,
  PuzzleDTO,
  User,
} from '../types'

const BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export class ApiError extends Error {
  status: number
  body: any
  constructor(status: number, body: any, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  retriedAuth?: boolean
}

function canRetryWithRefresh(path: string): boolean {
  return path !== '/auth/refresh'
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  options: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  let payload: any = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }
  if (!res.ok) {
    if (res.status === 401 && !options.retriedAuth && canRetryWithRefresh(path)) {
      try {
        await request('POST', '/auth/refresh', undefined, { retriedAuth: true })
        return await request<T>(method, path, body, { retriedAuth: true })
      } catch {
      }
    }
    const message =
      (payload && typeof payload === 'object' && (payload.detail || payload.message)) ||
      res.statusText
    throw new ApiError(res.status, payload, String(message))
  }
  return payload as T
}

export const api = {
  get: <T = any>(p: string) => request<T>('GET', p),
  post: <T = any>(p: string, body?: any) => request<T>('POST', p, body),
  patch: <T = any>(p: string, body?: any) => request<T>('PATCH', p, body),
  delete: <T = any>(p: string) => request<T>('DELETE', p),
}


export interface SignupPayload {
  email: string
  password: string
  display_name: string
  city?: string
}

export const auth = {
  signup: (p: SignupPayload) => api.post<User>('/auth/signup', p),
  login: (email: string, password: string) =>
    api.post<User>('/auth/login', { email, password }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout'),
  refresh: () => api.post<User>('/auth/refresh'),
  me: () => api.get<User>('/users/me'),
  updateMe: (patch: Partial<User>) => api.patch<User>('/users/me', patch),
  kidsMode: (enabled: boolean, pin: string) =>
    api.post<User>('/users/kids-mode', { enabled, pin }),
  wsTicket: (gameId: number) =>
    api.post<{ ticket: string; expires_in: number }>(`/auth/ws-ticket/${gameId}`),
}


export interface VsAiPayload {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  player_color: 'white' | 'black' | 'random'
  time_control: { initial_seconds: number; increment_seconds: number }
}

export interface FriendPayload {
  time_control: { initial_seconds: number; increment_seconds: number }
}

export const games = {
  createVsAi: (p: VsAiPayload) => api.post<GameDetail>('/games/vs-ai', p),
  createFriend: (p: FriendPayload) => api.post<GameDetail>('/games/friend', p),
  createRanked: (p: FriendPayload) => api.post<GameDetail>('/games/ranked', p),
  join: (token: string) => api.post<GameDetail>(`/games/join/${token}`),
  get: (id: number) => api.get<GameDetail>(`/games/${id}`),
  history: (limit = 20) => api.get(`/games/me/history?limit=${limit}`),
  move: (id: number, path: number[][]) =>
    api.post<GameDetail>(`/games/${id}/move`, { path }),
  analyze: (id: number) => api.post<GameDetail>(`/coach/games/${id}/analyze`),
}


export const leaderboard = {
  cities: () => api.get<{ cities: string[] }>('/leaderboard/cities'),
  global: (limit = 50) => api.get<LeaderboardEntry[]>(`/leaderboard/global?limit=${limit}`),
  city: (city: string, limit = 50) =>
    api.get<LeaderboardEntry[]>(
      `/leaderboard/city?city=${encodeURIComponent(city)}&limit=${limit}`,
    ),
  weekly: (limit = 50) => api.get<LeaderboardEntry[]>(`/leaderboard/weekly?limit=${limit}`),
}


export const puzzles = {
  daily: () => api.get<PuzzleDTO | null>('/puzzles/daily'),
  attempt: (puzzle_id: number, path: number[][]) =>
    api.post<PuzzleAttemptResult>('/puzzles/attempt', { puzzle_id, path }),
}


export interface BillingConfig {
  configured: boolean
  publishable_key: string | null
  prices: { monthly: string | null; yearly: string | null }
  skins: {
    pieces: Record<string, { label: string; pro: boolean }>
    boards: Record<string, { label: string; pro: boolean }>
  }
}

export const billing = {
  config: () => api.get<BillingConfig>('/billing/config'),
  checkout: (plan: 'monthly' | 'yearly') =>
    api.post<{ url: string }>('/billing/checkout', { plan }),
  portal: () => api.post<{ url: string }>('/billing/portal'),
}
