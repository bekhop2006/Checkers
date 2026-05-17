import type * as Party from "partykit/server";
import {
  applyMove,
  createInitialState,
  getGameStatus,
  getLegalMoves,
  moveToNotation,
  type Color,
  type Move,
} from "@checkers/engine";
import type {
  PublicRoomState,
  RoomPlayer,
  ClientMessage,
  ServerMessage,
} from "@checkers/shared-types";
import { parseClientMessage } from "@checkers/shared-types";

const BLITZ_MS = 180_000;

interface PlayerSlot extends RoomPlayer {
  connectionId: string;
}

interface RoomGameState {
  boardState: ReturnType<typeof createInitialState>;
  white: PlayerSlot | null;
  black: PlayerSlot | null;
  status: PublicRoomState["status"];
  clocks: PublicRoomState["clocks"];
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

  onConnect(conn: Party.Connection): void {
    this.sendSync(conn);
  }

  onMessage(raw: string, sender: Party.Connection): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const msg = parseClientMessage(parsed);
    if (!msg) return;

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg);
        break;
      case "move":
        this.handleMove(sender, msg.move);
        break;
      case "resign":
        this.handleResign(sender);
        break;
      case "sync":
        this.sendSync(sender);
        break;
    }
  }

  /** Assigns player to white or black and starts when both present. */
  handleJoin(conn: Party.Connection, msg: Extract<ClientMessage, { type: "join" }>): void {
    const slot: PlayerSlot = {
      userId: msg.userId,
      username: msg.username,
      elo: msg.elo,
      connectionId: conn.id,
    };

    if (msg.matchId) this.game.matchId = msg.matchId;

    if (!this.game.white) {
      this.game.white = slot;
    } else if (!this.game.black && this.game.white.userId !== msg.userId) {
      this.game.black = slot;
      this.game.status = "playing";
      this.game.lastTick = Date.now();
    }

    this.broadcast();
  }

  /** Validates and applies a move from the active player. */
  handleMove(conn: Party.Connection, move: Move): void {
    if (this.game.status !== "playing") return;

    const expectedColor: Color =
      this.game.white?.connectionId === conn.id ? "w" : "b";
    if (this.game.boardState.turn !== expectedColor) return;

    this.tickClocks();

    try {
      const next = applyMove(this.game.boardState, move);
      this.game.boardState = next;
      this.game.moveHistory.push(moveToNotation(move));

      const status = getGameStatus(next);
      if (status.over) {
        const winnerColor = status.winner;
        const winnerId =
          winnerColor === "w"
            ? this.game.white?.userId ?? null
            : winnerColor === "b"
              ? this.game.black?.userId ?? null
              : null;
        this.endGame(winnerId, status.reason);
        return;
      }
    } catch {
      const err: ServerMessage = { type: "error", message: "Illegal move" };
      conn.send(JSON.stringify(err));
    }

    this.broadcast();
  }

  /** Handles player resignation. */
  handleResign(conn: Party.Connection): void {
    if (this.game.status !== "playing") return;
    const isWhite = this.game.white?.connectionId === conn.id;
    const winnerId = isWhite
      ? this.game.black?.userId ?? null
      : this.game.white?.userId ?? null;
    this.endGame(winnerId, "resign");
    this.broadcast();
  }

  /** Ticks clocks based on side to move. */
  tickClocks(): void {
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
  endGame(winnerId: string | null, reason: string): void {
    this.game.status = "finished";
    this.game.winnerId = winnerId;
    this.game.endedReason = reason;
    const msg: ServerMessage = {
      type: "finished",
      winnerId,
      reason,
      matchId: this.game.matchId,
      state: this.publicState(),
    };
    this.room.broadcast(JSON.stringify(msg));
  }

  sendSync(conn: Party.Connection): void {
    const msg: ServerMessage = { type: "sync", state: this.publicState() };
    conn.send(JSON.stringify(msg));
  }

  publicState(): PublicRoomState {
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

  broadcast(): void {
    const msg: ServerMessage = { type: "sync", state: this.publicState() };
    this.room.broadcast(JSON.stringify(msg));
  }
}
