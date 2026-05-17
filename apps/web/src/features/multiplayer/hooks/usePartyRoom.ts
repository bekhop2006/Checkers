"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type { BoardState, Move } from "@checkers/engine";

export interface PartyRoomState {
  boardState: BoardState;
  white: { userId: string; username: string; elo: number } | null;
  black: { userId: string; username: string; elo: number } | null;
  status: "waiting" | "playing" | "finished";
  clocks: { whiteMs: number; blackMs: number };
  matchId: string | null;
  winnerId: string | null;
  endedReason: string | null;
  moveHistory: string[];
}

interface UsePartyRoomOptions {
  roomId: string;
  userId: string;
  username: string;
  elo: number;
  matchId?: string;
  onFinished?: (data: {
    winnerId: string | null;
    reason: string;
    matchId: string | null;
  }) => void;
}

/** Connects to PartyKit room for realtime multiplayer. */
export function usePartyRoom({
  roomId,
  userId,
  username,
  elo,
  matchId,
  onFinished,
}: UsePartyRoomOptions) {
  const [state, setState] = useState<PartyRoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const host =
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

  useEffect(() => {
    const socket = new PartySocket({
      host,
      room: roomId,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      socket.send(
        JSON.stringify({
          type: "join",
          userId,
          username,
          elo,
          matchId,
        })
      );
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "sync") {
        setState(msg.state as PartyRoomState);
      }
      if (msg.type === "finished") {
        onFinishedRef.current?.({
          winnerId: msg.winnerId as string | null,
          reason: msg.reason as string,
          matchId: msg.matchId as string | null,
        });
        setState((s) =>
          s
            ? {
                ...s,
                status: "finished",
                winnerId: msg.winnerId as string | null,
                endedReason: msg.reason as string,
              }
            : s
        );
      }
    });

    socket.addEventListener("close", () => setConnected(false));

    return () => {
      socket.close();
    };
  }, [roomId, userId, username, elo, matchId, host]);

  const sendMove = useCallback((move: Move) => {
    socketRef.current?.send(JSON.stringify({ type: "move", move }));
  }, []);

  const resign = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "resign" }));
  }, []);

  return { state, connected, sendMove, resign };
}
