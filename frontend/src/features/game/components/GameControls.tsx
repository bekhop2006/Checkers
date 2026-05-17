"use client";

import { cn } from "@/shared/lib/utils";

interface GameControlsProps {
  onReset: () => void;
  onHint?: () => void;
  onResign?: () => void;
  hintDisabled?: boolean;
  className?: string;
}

/** Action buttons for an active game session. */
export function GameControls({
  onReset,
  onHint,
  onResign,
  hintDisabled,
  className,
}: GameControlsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {onHint && (
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
        >
          Подсказка
        </button>
      )}
      {onResign && (
        <button
          type="button"
          onClick={onResign}
          className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium"
        >
          Сдаться
        </button>
      )}
      <button
        type="button"
        onClick={onReset}
        className="px-4 py-2 rounded-lg bg-stone-600 hover:bg-stone-500 text-white text-sm font-medium"
      >
        Новая игра
      </button>
    </div>
  );
}
