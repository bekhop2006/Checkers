"use client";

import { cn } from "@/shared/lib/utils";

interface EloBadgeProps {
  elo: number;
  className?: string;
}

/** Displays player Elo rating in header. */
export function EloBadge({ elo, className }: EloBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-semibold",
        className
      )}
    >
      ⚡ {elo} Elo
    </span>
  );
}
