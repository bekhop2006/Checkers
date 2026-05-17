import { useEffect, useRef, useState } from 'react'
import { ApiError, auth } from '../../lib/api'
import type { GameDetail, WSMessage } from '../../types'

const WS_BASE = (import.meta.env.VITE_WS_BASE as string) || '/ws'

type Sender = (m: any) => void

export function useGameSocket(gameId: number | null, enabled: boolean) {
  const [game, setGame] = useState<GameDetail | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<{ timer: number | null; tries: number }>({ timer: null, tries: 0 })

  useEffect(() => {
    if (!enabled || !gameId) return

    let cancelled = false

    const scheduleReconnect = (reason?: string) => {
      if (cancelled) return
      const tries = ++reconnectRef.current.tries
      const wait = Math.min(1500 * tries, 15_000)
      if (reason) setError(reason)
      reconnectRef.current.timer = window.setTimeout(() => connect(), wait)
    }

    const connect = async () => {
      try {
        let ticket: string
        try {
          const t = await auth.wsTicket(gameId)
          ticket = t.ticket
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await auth.refresh()
            const t = await auth.wsTicket(gameId)
            ticket = t.ticket
          } else {
            throw e
          }
        }
        if (cancelled) return
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const base = WS_BASE.startsWith('http')
          ? WS_BASE.replace(/^http/, 'ws')
          : `${proto}//${window.location.host}${WS_BASE}`
        const url = `${base}/game/${gameId}?t=${encodeURIComponent(ticket)}`
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onopen = () => {
          setConnected(true)
          setError(null)
          reconnectRef.current.tries = 0
          ws.send(JSON.stringify({ type: 'hello' }))
        }
        ws.onmessage = (ev) => {
          try {
            const msg: WSMessage = JSON.parse(ev.data)
            if (msg.type === 'state') {
              setGame(msg as unknown as GameDetail)
              setError(null)
            } else if (msg.type === 'tick') {
              setGame((g) =>
                g ? { ...g, white_ms_left: msg.white_ms_left, black_ms_left: msg.black_ms_left } : g,
              )
            } else if (msg.type === 'error') {
              setError(msg.code)
            }
          } catch {
            /* ignore malformed payloads */
          }
        }
        ws.onclose = () => {
          setConnected(false)
          wsRef.current = null
          if (cancelled) return
          scheduleReconnect('ws_disconnected')
        }
        ws.onerror = () => setError('ws_error')
      } catch (e) {
        scheduleReconnect(e instanceof Error ? e.message : 'connect_failed')
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectRef.current.timer) window.clearTimeout(reconnectRef.current.timer)
      wsRef.current?.close()
    }
  }, [gameId, enabled])

  const send: Sender = (m) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('ws_not_connected')
      return
    }
    ws.send(JSON.stringify(m))
  }

  return { game, connected, error, send }
}
