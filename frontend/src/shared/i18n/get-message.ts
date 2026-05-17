import type { Locale, MessageTree } from "./types";
import { ru } from "./messages/ru";
import { kk } from "./messages/kk";
import { en } from "./messages/en";

const catalogs: Record<Locale, MessageTree> = { ru, kk, en };

/** Resolves dot path like "nav.play" from message tree. */
export function getMessage(locale: Locale, key: string): string {
  const parts = key.split(".");
  let node: string | MessageTree | undefined = catalogs[locale];

  for (const part of parts) {
    if (!node || typeof node === "string") {
      return key;
    }
    node = node[part];
  }

  return typeof node === "string" ? node : key;
}
