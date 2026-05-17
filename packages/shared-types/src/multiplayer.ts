import type { BoardState, Move } from "@checkers/engine";

/** Room lifecycle status. */
export type RoomStatus = "waiting" | "playing" | "finished";

/** Public player info in a room. */
export interface RoomPlayer {
  userId: string;
  username: string;
  elo: number;
}

/** Clock state for blitz. */
export interface RoomClocks {
  whiteMs: number;
  blackMs: number;
}

/** Serializable room state broadcast to clients. */
export interface PublicRoomState {
  boardState: BoardState;
  white: RoomPlayer | null;
  black: RoomPlayer | null;
  status: RoomStatus;
  clocks: RoomClocks;
  matchId: string | null;
  winnerId: string | null;
  endedReason: string | null;
  moveHistory: string[];
  legalMovesCount: number;
}

/** Client → server messages. */
export type ClientMessage =
  | { type: "join"; userId: string; username: string; elo: number; matchId?: string }
  | { type: "move"; move: Move }
  | { type: "resign" }
  | { type: "sync" };

/** Server → client messages. */
export type ServerMessage =
  | { type: "sync"; state: PublicRoomState }
  | {
      type: "finished";
      winnerId: string | null;
      reason: string;
      matchId: string | null;
      state: PublicRoomState;
    }
  | { type: "error"; message: string };

/** Parses unknown JSON into a client message. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const msg = raw as ClientMessage;
  if (
    msg.type === "join" ||
    msg.type === "move" ||
    msg.type === "resign" ||
    msg.type === "sync"
  ) {
    return msg;
  }
  return null;
}
