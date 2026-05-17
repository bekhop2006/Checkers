"use client";

import { Zap } from "lucide-react";
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
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold",
        "bg-gradient-to-r from-brand-500/15 to-orange-500/15",
        "text-brand-800 dark:text-brand-200",
        "border border-brand-500/25",
        className
      )}
    >
      <Zap className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
      {elo}
    </span>
  );
}
