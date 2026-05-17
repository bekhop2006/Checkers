"use client";

import { useState } from "react";

interface ShareLinkProps {
  url: string;
}

/** Copy invite link button for multiplayer rooms. */
export function ShareLink({ url }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <p className="text-sm text-stone-500">Ссылка для друга:</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-sm truncate"
        />
        <button
          type="button"
          onClick={copy}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium shrink-0"
        >
          {copied ? "Скопировано!" : "Копировать"}
        </button>
      </div>
    </div>
  );
}
