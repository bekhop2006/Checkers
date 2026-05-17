"use client";

import Link from "next/link";
import { Users, Cpu, ChevronRight } from "lucide-react";
import { CreateBlitzRoom } from "@/features/multiplayer/components/CreateBlitzRoom";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useT } from "@/shared/i18n/context/locale-context";

/** Play hub with i18n labels. */
export function PlayHub() {
  const t = useT();

  return (
    <div className="page-container py-8 sm:py-10 md:py-14 max-w-xl">
      <PageHeader
        title={t("play.title")}
        subtitle={t("play.subtitle")}
        centered
      />
      <div className="flex flex-col gap-3 sm:gap-4 animate-slide-up">
        <div className="glass-card p-5 sm:p-6 border-brand-500/20">
          <CreateBlitzRoom />
        </div>
        <ModeLink
          href="/play/local"
          icon={<Users className="h-6 w-6" />}
          title={t("play.local")}
          desc={t("play.localDesc")}
        />
        <ModeLink
          href="/play/ai"
          icon={<Cpu className="h-6 w-6" />}
          title={t("play.ai")}
          desc={t("play.aiDesc")}
        />
      </div>
    </div>
  );
}


function ModeLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 group hover:border-brand-500/30 transition-all"
    >
      <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-brand-600 group-hover:bg-brand-100 dark:group-hover:bg-brand-950/50 transition-colors">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="font-semibold text-stone-900 dark:text-stone-50 block text-sm sm:text-base">
          {title}
        </span>
        <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">{desc}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
