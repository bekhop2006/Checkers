"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { EloBadge } from "@/features/rating/components/EloBadge";
import { useAuth } from "@/features/auth/context/auth-context";
import { useT } from "@/shared/i18n/context/locale-context";
import { cn } from "@/shared/lib/utils";

/** Site header with nav, language switcher and Elo badge. */
export function Header() {
  const pathname = usePathname();
  const { user, profile, loading, isConfigured, signOut } = useAuth();
  const t = useT();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/play", label: t("nav.play") },
    { href: "/players", label: t("nav.players") },
    { href: "/leaderboard", label: t("nav.leaderboard") },
    { href: "/history", label: t("nav.history"), auth: true as const },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-950/70 backdrop-blur-xl">
      <div className="page-container flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
        <Logo />

        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 justify-center max-w-2xl mx-4">
          {navItems
            .filter((n) => !("auth" in n) || user)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link px-2.5 xl:px-4 py-2 rounded-lg text-sm whitespace-nowrap",
                  pathname.startsWith(item.href) &&
                    "nav-link-active bg-brand-50 dark:bg-brand-950/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          <Link
            href="/pricing"
            className="ml-1 xl:ml-2 px-3 xl:px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-orange-600 hover:opacity-90 shadow-md shadow-brand-500/20 transition-opacity whitespace-nowrap"
          >
            {t("nav.pro")}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSwitcher className="sm:hidden" />

          {!loading && user && profile ? (
            <>
              <EloBadge elo={profile.elo} className="hidden md:inline-flex" />
              <Link
                href="/settings"
                className="hidden lg:inline text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-brand-600 truncate max-w-[100px] xl:max-w-[140px]"
              >
                @{profile.username}
              </Link>
              {isConfigured ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="btn-ghost hidden md:inline-flex text-sm"
                >
                  {t("nav.logout")}
                </button>
              ) : null}
            </>
          ) : !loading && isConfigured ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link href="/auth/login" className="btn-ghost text-sm px-2 sm:px-3">
                {t("nav.login")}
              </Link>
              <Link href="/auth/signup" className="btn-primary !py-2 !px-3 sm:!px-4 text-sm">
                {t("nav.signup")}
              </Link>
              <LanguageSwitcher />
            </div>
          ) : null}

          <ThemeToggle />
          {user ? <LanguageSwitcher className="hidden sm:inline-flex" /> : null}

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={t("nav.menu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl px-3 sm:px-4 py-4 space-y-1 max-h-[min(70vh,480px)] overflow-y-auto">
          {navItems
            .filter((n) => !("auth" in n) || user)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-xl font-medium",
                  pathname.startsWith(item.href)
                    ? "bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300"
                    : "text-stone-700 dark:text-stone-300"
                )}
              >
                {item.label}
              </Link>
            ))}
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-3 rounded-xl font-medium text-brand-600"
          >
            {t("nav.pro")}
          </Link>
          {!user && isConfigured ? (
            <div className="pt-3 mt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs text-stone-500">{t("nav.language")}</span>
                <LanguageSwitcher />
              </div>
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-center"
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className="block btn-primary text-center"
              >
                {t("nav.signup")}
              </Link>
            </div>
          ) : null}
          {user && profile ? (
            <div className="pt-3 mt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <div className="px-4 flex items-center justify-between gap-2">
                <span className="font-medium truncate">@{profile.username}</span>
                <EloBadge elo={profile.elo} />
              </div>
              {isConfigured ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="w-full btn-ghost justify-center text-red-500"
                >
                  {t("nav.logout")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
