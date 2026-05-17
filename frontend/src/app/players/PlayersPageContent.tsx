"use client";

import { PlayerSearch } from "@/features/social/components/PlayerSearch";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useT } from "@/shared/i18n/context/locale-context";

/** Players search page with i18n. */
export function PlayersPageContent() {
  const t = useT();

  return (
    <div className="page-container py-8 sm:py-10 md:py-14 max-w-xl">
      <PageHeader title={t("players.title")} subtitle={t("players.subtitle")} />
      <PlayerSearch />
    </div>
  );
}
