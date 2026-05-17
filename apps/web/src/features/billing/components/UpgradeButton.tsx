import Link from "next/link";

/** CTA link to Pro pricing. */
export function UpgradeButton() {
  return (
    <Link
      href="/pricing"
      className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:opacity-90"
    >
      Upgrade to Pro
    </Link>
  );
}
