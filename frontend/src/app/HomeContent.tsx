"use client";

import Link from "next/link";
import { Zap, Link2, Bot, Trophy, Clock } from "lucide-react";
import { useT } from "@/shared/i18n/context/locale-context";

/** Landing hero and features with i18n. */
export function HomeContent() {
  const t = useT();

  return (
    <div className="page-container py-8 sm:py-12 md:py-20">
      <section className="text-center max-w-3xl mx-auto animate-fade-in px-1">
        <p className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 mb-4 sm:mb-6">
          <Zap className="h-4 w-4 shrink-0" />
          {t("home.badge")}
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
          <span className="bg-gradient-to-r from-brand-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            {t("home.title")}
          </span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-stone-600 dark:text-stone-400 mb-8 sm:mb-10 leading-relaxed px-2">
          {t("home.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
          <Link href="/play" className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 shadow-glow w-full sm:w-auto">
            <Zap className="h-5 w-5" />
            {t("home.playBlitz")}
          </Link>
          <Link href="/leaderboard" className="btn-secondary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto">
            <Trophy className="h-5 w-5" />
            {t("home.leaderboard")}
          </Link>
        </div>
      </section>

      <section className="mt-14 sm:mt-20 md:mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        <Feature
          icon={<Clock className="h-6 w-6 text-brand-600" />}
          title={t("home.featureBlitzTitle")}
          desc={t("home.featureBlitzDesc")}
        />
        <Feature
          icon={<Link2 className="h-6 w-6 text-brand-600" />}
          title={t("home.featureLinkTitle")}
          desc={t("home.featureLinkDesc")}
        />
        <Feature
          icon={<Bot className="h-6 w-6 text-brand-600" />}
          title={t("home.featureCoachTitle")}
          desc={t("home.featureCoachDesc")}
        />
      </section>

      <section className="mt-12 sm:mt-16 glass-card p-6 sm:p-8 md:p-10 text-center animate-slide-up">
        <h2 className="text-lg sm:text-xl font-bold mb-2">{t("home.ctaTitle")}</h2>
        <p className="text-stone-600 dark:text-stone-400 mb-5 sm:mb-6 text-sm sm:text-base">
          {t("home.ctaSubtitle")}
        </p>
        <Link href="/auth/signup" className="btn-primary w-full sm:w-auto">
          {t("home.ctaSignup")}
        </Link>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass-card p-5 sm:p-6 md:p-7 hover:shadow-glow transition-shadow duration-300 group">
      <div className="h-12 w-12 rounded-xl bg-brand-100 dark:bg-brand-950/80 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold text-base sm:text-lg mb-2 text-stone-900 dark:text-stone-50">
        {title}
      </h3>
      <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
