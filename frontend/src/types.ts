// Shared types matching the FastAPI Pydantic schemas.

export type Square = [number, number]

export interface LegalMove {
  path: Square[]
  captured: Square[]
  promoted: boolean
}

export interface MoveDTO {
  ply: number
  side: 0 | 1
  notation: string
  path: Square[]
  captured: Square[]
  promoted: boolean
  classification?: string | null
  eval_before?: number | null
  eval_after?: number | null
  best_line?: string[] | null
  narrative?: string | null
}

export interface BoardPosition {
  cells: number[][] // 8x8, values match Piece enum: 0=empty,1=wM,2=wK,3=bM,4=bK
  turn: 0 | 1 // 0 = white, 1 = black
  pliesSinceProgress: number
}

export type GameMode = 'vs_ai' | 'friend' | 'ranked'
export type GameStatus = 'active' | 'completed' | 'abandoned'
export type GameResult = 'white' | 'black' | 'draw' | 'in_progress'

export interface GameDetail {
  id: number
  mode: GameMode
  status: GameStatus
  result: GameResult
  end_reason: string | null
  white_user_id: number | null
  black_user_id: number | null
  ai_difficulty: string | null
  created_at: string
  ended_at: string | null
  position: BoardPosition
  white_ms_left: number
  black_ms_left: number
  initial_seconds: number
  increment_seconds: number
  friend_token: string | null
  moves: MoveDTO[]
  legal_moves: LegalMove[]
  coach_status: 'not_started' | 'running' | 'ready' | 'failed'
  coach_data: any
  white_rating_before?: number | null
  black_rating_before?: number | null
  white_rating_after?: number | null
  black_rating_after?: number | null
}

export interface User {
  id: number
  email: string
  display_name: string
  city: string | null
  rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
  streak: number
  puzzle_streak: number
  kids_mode: boolean
  theme: string
  board_skin: string
  piece_skin: string
  locale: string
  is_pro: boolean
  pro_until: string | null
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  display_name: string
  city: string | null
  rating: number
  games_played: number
  wins: number
  is_pro: boolean
}

export interface PuzzleDTO {
  id: number
  theme: string
  difficulty: number
  side_to_move: 0 | 1
  description: string
  position: BoardPosition
  legal_moves: LegalMove[]
}

export interface PuzzleAttemptResult {
  correct: boolean
  streak: number
  solution: Square[][] | null
}

// Wire-level WebSocket message types
export type WSMessage =
  | ({ type: 'state' } & GameDetail)
  | { type: 'tick'; white_ms_left: number; black_ms_left: number }
  | { type: 'error'; code: string; message?: string }
  | { type: 'chat'; from: number; text: string }
  | { type: 'draw_offer'; from: number }
  | { type: 'ended'; result: GameResult; reason: string }
