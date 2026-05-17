"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type { Move } from "@checkers/engine";
import type {
  PublicRoomState,
  ServerMessage,
  ClientMessage,
} from "@checkers/shared-types";

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

/** Parses server WebSocket message. */
function parseServerMessage(raw: string): ServerMessage | null {
  try {
    return JSON.parse(raw) as ServerMessage;
  } catch {
    return null;
  }
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
  const [state, setState] = useState<PublicRoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const host =
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

  useEffect(() => {
    const socket = new PartySocket({ host, room: roomId });
    socketRef.current = socket;

    const joinMessage: ClientMessage = {
      type: "join",
      userId,
      username,
      elo,
      matchId,
    };

    socket.addEventListener("open", () => {
      setConnected(true);
      socket.send(JSON.stringify(joinMessage));
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const msg = parseServerMessage(event.data);
      if (!msg) return;

      if (msg.type === "sync") {
        setState(msg.state);
      }
      if (msg.type === "finished") {
        onFinishedRef.current?.({
          winnerId: msg.winnerId,
          reason: msg.reason,
          matchId: msg.matchId,
        });
        setState(msg.state);
      }
    });

    socket.addEventListener("close", () => setConnected(false));

    return () => socket.close();
  }, [roomId, userId, username, elo, matchId, host]);

  const sendMove = useCallback((move: Move) => {
    const payload: ClientMessage = { type: "move", move };
    socketRef.current?.send(JSON.stringify(payload));
  }, []);

  const resign = useCallback(() => {
    const payload: ClientMessage = { type: "resign" };
    socketRef.current?.send(JSON.stringify(payload));
  }, []);

  return { state, connected, sendMove, resign };
}
