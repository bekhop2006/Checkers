import type * as Party from "partykit/server";
import {
  applyMove,
  createInitialState,
  getGameStatus,
  getLegalMoves,
  moveToNotation,
  type BoardState,
  type Color,
  type Move,
} from "@checkers/engine";

const BLITZ_MS = 180_000;

interface PlayerSlot {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
}

interface RoomGameState {
  boardState: BoardState;
  white: PlayerSlot | null;
  black: PlayerSlot | null;
  status: "waiting" | "playing" | "finished";
  clocks: { whiteMs: number; blackMs: number };
  lastTick: number;
  matchId: string | null;
  winnerId: string | null;
  endedReason: string | null;
  moveHistory: string[];
}

/** PartyKit server for rated blitz checkers rooms. */
export default class CheckersRoom implements Party.Server {
  game: RoomGameState;

  constructor(readonly room: Party.Room) {
    this.game = {
      boardState: createInitialState(),
      white: null,
      black: null,
      status: "waiting",
      clocks: { whiteMs: BLITZ_MS, blackMs: BLITZ_MS },
      lastTick: Date.now(),
      matchId: null,
      winnerId: null,
      endedReason: null,
      moveHistory: [],
    };
  }

  onConnect(conn: Party.Connection) {
    this.sendSync(conn);
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg);
        break;
      case "move":
        this.handleMove(sender, msg);
        break;
      case "resign":
        this.handleResign(sender);
        break;
      case "sync":
        this.sendSync(sender);
        break;
      default:
        break;
    }
  }

  /** Assigns player to white or black and starts when both present. */
  handleJoin(
    conn: Party.Connection,
    msg: { userId?: string; username?: string; elo?: number; matchId?: string }
  ) {
    const userId = String(msg.userId ?? conn.id);
    const username = String(msg.username ?? "Player");
    const elo = Number(msg.elo ?? 1000);

    if (msg.matchId) this.game.matchId = String(msg.matchId);

    const slot: PlayerSlot = {
      userId,
      username,
      elo,
      connectionId: conn.id,
    };

    if (!this.game.white) {
      this.game.white = slot;
    } else if (!this.game.black && this.game.white.userId !== userId) {
      this.game.black = slot;
      this.game.status = "playing";
      this.game.lastTick = Date.now();
    }

    this.broadcast();
  }

  /** Validates and applies a move from the active player. */
  handleMove(conn: Party.Connection, msg: { move?: Move }) {
    if (this.game.status !== "playing" || !msg.move) return;

    const player = this.getPlayerByConnection(conn.id);
    if (!player) return;

    const expectedColor: Color =
      this.game.white?.connectionId === conn.id ? "w" : "b";
    if (this.game.boardState.turn !== expectedColor) return;

    this.tickClocks();

    try {
      const next = applyMove(this.game.boardState, msg.move);
      this.game.boardState = next;
      this.game.moveHistory.push(moveToNotation(msg.move));

      const status = getGameStatus(next);
      if (status.over) {
        const winnerColor = status.winner;
        const winner =
          winnerColor === "w"
            ? this.game.white?.userId
            : winnerColor === "b"
              ? this.game.black?.userId
              : null;
        this.endGame(winner ?? null, status.reason);
      }
    } catch {
      conn.send(JSON.stringify({ type: "error", message: "Illegal move" }));
    }

    this.broadcast();
  }

  /** Handles player resignation. */
  handleResign(conn: Party.Connection) {
    if (this.game.status !== "playing") return;
    const isWhite = this.game.white?.connectionId === conn.id;
    const winnerId = isWhite
      ? this.game.black?.userId ?? null
      : this.game.white?.userId ?? null;
    this.endGame(winnerId, "resign");
    this.broadcast();
  }

  /** Ticks clocks based on side to move. */
  tickClocks() {
    const now = Date.now();
    const elapsed = now - this.game.lastTick;
    this.game.lastTick = now;
    if (this.game.boardState.turn === "w") {
      this.game.clocks.whiteMs = Math.max(0, this.game.clocks.whiteMs - elapsed);
      if (this.game.clocks.whiteMs === 0) {
        this.endGame(this.game.black?.userId ?? null, "timeout");
      }
    } else {
      this.game.clocks.blackMs = Math.max(0, this.game.clocks.blackMs - elapsed);
      if (this.game.clocks.blackMs === 0) {
        this.endGame(this.game.white?.userId ?? null, "timeout");
      }
    }
  }

  /** Ends game and notifies clients to persist via web API. */
  endGame(winnerId: string | null, reason: string) {
    this.game.status = "finished";
    this.game.winnerId = winnerId;
    this.game.endedReason = reason;
    this.room.broadcast(
      JSON.stringify({
        type: "finished",
        winnerId,
        reason,
        matchId: this.game.matchId,
        state: this.publicState(),
      })
    );
  }

  getPlayerByConnection(connectionId: string) {
    if (this.game.white?.connectionId === connectionId) return this.game.white;
    if (this.game.black?.connectionId === connectionId) return this.game.black;
    return null;
  }

  sendSync(conn: Party.Connection) {
    conn.send(
      JSON.stringify({ type: "sync", state: this.publicState() })
    );
  }

  publicState() {
    return {
      boardState: this.game.boardState,
      white: this.game.white
        ? {
            userId: this.game.white.userId,
            username: this.game.white.username,
            elo: this.game.white.elo,
          }
        : null,
      black: this.game.black
        ? {
            userId: this.game.black.userId,
            username: this.game.black.username,
            elo: this.game.black.elo,
          }
        : null,
      status: this.game.status,
      clocks: this.game.clocks,
      matchId: this.game.matchId,
      winnerId: this.game.winnerId,
      endedReason: this.game.endedReason,
      moveHistory: this.game.moveHistory,
      legalMovesCount: getLegalMoves(this.game.boardState).length,
    };
  }

  broadcast() {
    this.room.broadcast(
      JSON.stringify({ type: "sync", state: this.publicState() })
    );
  }
}

