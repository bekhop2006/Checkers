"use client";

interface PostGameRatingModalProps {
  open: boolean;
  delta: number;
  newElo: number;
  won: boolean;
  onClose: () => void;
}

/** Modal shown after rated game with Elo change. */
export function PostGameRatingModal({
  open,
  delta,
  newElo,
  won,
  onClose,
}: PostGameRatingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <h2 className="text-2xl font-bold mb-2">
          {won ? "Победа!" : "Поражение"}
        </h2>
        <p
          className={`text-4xl font-mono font-bold mb-2 ${
            delta >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {delta}
        </p>
        <p className="text-stone-500 mb-6">Новый рейтинг: {newElo}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
