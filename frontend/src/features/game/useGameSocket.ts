import { useEffect, useRef, useState } from 'react'
import { auth } from '../../lib/api'
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

    const connect = async () => {
      try {
        const { ticket } = await auth.wsTicket(gameId)
        if (cancelled) return
        // Build absolute ws:// URL from window.location.
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const base = WS_BASE.startsWith('http')
          ? WS_BASE.replace(/^http/, 'ws')
          : `${proto}//${window.location.host}${WS_BASE}`
        const url = `${base}/game/${gameId}?t=${encodeURIComponent(ticket)}`
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onopen = () => {
          setConnected(true)
          reconnectRef.current.tries = 0
          ws.send(JSON.stringify({ type: 'hello' }))
        }
        ws.onmessage = (ev) => {
          try {
            const msg: WSMessage = JSON.parse(ev.data)
            if (msg.type === 'state') {
              setGame(msg as unknown as GameDetail)
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
          if (cancelled) return
          const tries = ++reconnectRef.current.tries
          const wait = Math.min(2000 * tries, 15_000)
          reconnectRef.current.timer = window.setTimeout(() => connect(), wait)
        }
        ws.onerror = () => setError('ws_error')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'connect_failed')
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectRef.current.timer) window.clearTimeout(reconnectRef.current.timer)
      wsRef.current?.close()
    }
  }, [gameId, enabled])

  const send: Sender = (m) => wsRef.current?.send(JSON.stringify(m))

  return { game, connected, error, send }
}
