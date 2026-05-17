"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { playerProfilePath } from "@/shared/lib/username";

interface CopyProfileLinkProps {
  username: string;
}

/** Copies public profile URL to clipboard. */
export function CopyProfileLink({ username }: CopyProfileLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const path = playerProfilePath(username);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="btn-secondary w-full"
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Ссылка скопирована" : "Скопировать ссылку на профиль"}
    </button>
  );
}
