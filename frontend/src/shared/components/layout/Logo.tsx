import Link from "next/link";
import { cn } from "@/shared/lib/utils";

interface LogoProps {
  className?: string;
}

/** Brand logo with checker mark. */
export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 group font-bold text-lg tracking-tight",
        className
      )}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-orange-600 text-white shadow-md shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-shadow"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="8" cy="8" r="3" opacity="0.9" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      </span>
      <span className="bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent dark:from-brand-400 dark:to-orange-400">
        Blitz Checkers
      </span>
    </Link>
  );
}
