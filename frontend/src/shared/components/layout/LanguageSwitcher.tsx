"use client";

import { useLocale } from "@/shared/i18n/context/locale-context";
import type { Locale } from "@/shared/i18n/types";
import { cn } from "@/shared/lib/utils";

/** RU / KK / EN language toggle for header. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  const options: Locale[] = ["ru", "kk", "en"];

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100/80 dark:bg-stone-900/80",
        className
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      {options.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "px-2 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-colors min-w-[2.1rem] sm:min-w-[2.35rem]",
            locale === code
              ? "bg-white dark:bg-stone-800 text-brand-700 dark:text-brand-300 shadow-sm"
              : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          )}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}
