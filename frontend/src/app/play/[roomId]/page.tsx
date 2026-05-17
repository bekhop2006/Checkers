"use client";

import { CheckersBoard } from "@/features/board/components/CheckersBoard";
import { ClockDisplay } from "@/features/blitz/components/ClockDisplay";
import { ShareLink } from "@/features/multiplayer/components/ShareLink";
import { PostGameRatingModal } from "@/features/rating/components/PostGameRatingModal";
import { usePartyRoom } from "@/features/multiplayer/hooks/usePartyRoom";
import { useUser } from "@/shared/hooks/useUser";
import type { FinishMatchResponse } from "@checkers/shared-types";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface RatingModalState {
  open: boolean;
  delta: number;
  newElo: number;
  won: boolean;
}

/** Rated blitz multiplayer room by share link. */
export default function RoomPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const matchIdParam = searchParams.get("matchId") ?? undefined;
  const { user, profile } = useUser();

  const userId = user?.id ?? `guest-${roomId}`;
  const username = profile?.username ?? "Player";
  const elo = profile?.elo ?? 1000;

  const [shareUrl, setShareUrl] = useState("");
  const [ratingModal, setRatingModal] = useState<RatingModalState>({
    open: false,
    delta: 0,
    newElo: elo,
    won: false,
  });

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const onFinished = useCallback(
    async (data: {
      winnerId: string | null;
      reason: string;
      matchId: string | null;
    }) => {
      const mid = data.matchId ?? matchIdParam;
      if (!mid || !user) return;
      try {
        const res = await fetch(`/api/matches/${mid}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerId: data.winnerId,
            reason: data.reason,
          }),
        });
        const json = (await res.json()) as FinishMatchResponse;
        const isWhite = json.white?.userId === user.id;
        const side = isWhite ? json.white : json.black;
        if (side) {
          setRatingModal({
            open: true,
            delta: side.delta,
            newElo: side.after,
            won: side.delta > 0,
          });
        }
      } catch (e) {
        console.error(e);
      }
    },
    [user, matchIdParam]
  );

  const { state, connected, sendMove, resign } = usePartyRoom({
    roomId,
    userId,
    username,
    elo,
    matchId: matchIdParam,
    onFinished,
  });

  const myColor =
    state?.white?.userId === userId
      ? "w"
      : state?.black?.userId === userId
        ? "b"
        : null;

  const canMove =
    state?.status === "playing" &&
    myColor !== null &&
    state.boardState.turn === myColor;

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-stone-500">
          {connected ? "Загрузка комнаты..." : "Подключение..."}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container py-8 sm:py-12 max-w-lg flex flex-col items-center gap-6">
      <div className="text-center w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Blitz
          <span className="text-stone-400 font-normal text-lg ml-2">#{roomId.slice(0, 6)}</span>
        </h1>
        <p className="text-stone-500 text-sm mt-1">
        {state.status === "waiting"
          ? "Ожидание соперника..."
          : state.status === "finished"
            ? "Партия завершена"
            : `Ход: ${state.boardState.turn === "w" ? "Белые" : "Чёрные"}`}
      </p>
      </div>

      {state.status === "playing" && (
        <ClockDisplay
          whiteMs={state.clocks.whiteMs}
          blackMs={state.clocks.blackMs}
          turn={state.boardState.turn}
        />
      )}

      <div className="glass-card px-4 py-3 flex flex-wrap justify-center gap-4 text-sm w-full">
        <span>⚪ {state.white?.username ?? "—"} ({state.white?.elo ?? "?"})</span>
        <span>⚫ {state.black?.username ?? "—"} ({state.black?.elo ?? "?"})</span>
      </div>

      <CheckersBoard
        state={state.boardState}
        onMove={sendMove}
        disabled={!canMove}
        orientation={myColor ?? "w"}
      />

      {state.status === "waiting" && shareUrl && <ShareLink url={shareUrl} />}

      {state.status === "playing" && myColor && (
        <button
          type="button"
          onClick={resign}
          className="px-5 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-sm font-medium transition-colors"
        >
          Сдаться
        </button>
      )}

      <PostGameRatingModal
        open={ratingModal.open}
        delta={ratingModal.delta}
        newElo={ratingModal.newElo}
        won={ratingModal.won}
        onClose={() => setRatingModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
