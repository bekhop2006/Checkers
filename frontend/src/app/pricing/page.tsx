"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Pricing page with Pro upgrade and skins. */
export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const checkout = async (type: "pro" | "skin") => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else alert(json.message ?? json.error ?? "Demo: Stripe test mode");
    } catch {
      alert("Stripe не настроен — demo mode");
    }
    setLoading(false);
  };

  return (
    <div className="page-container py-10 sm:py-16 max-w-5xl">
      <PageHeader
        title="Тарифы"
        subtitle="Больше разборов, скины и Pro-бейдж"
        centered
      />
      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        <Plan
          name="Free"
          price="0 ₸"
          features={["Blitz multiplayer", "1 AI Coach / день", "Классические фигуры"]}
        />
        <Plan
          name="Pro"
          price="990 ₸/мес"
          features={[
            "Безлимитный AI Coach",
            "Премиум-скины",
            "Pro badge",
          ]}
          highlight
          action={() => checkout("pro")}
          loading={loading}
          actionLabel="Upgrade to Pro"
        />
        <Plan
          name="Neon Skin"
          price="490 ₸"
          features={["Неоновая доска и фигуры", "Навсегда"]}
          action={() => checkout("skin")}
          loading={loading}
          actionLabel="Купить скин"
        />
      </div>
      <p className="text-center text-stone-500 text-sm mt-10">
        Demo: Stripe test mode — реальные списания не производятся без ключей.
      </p>
    </div>
  );
}

function Plan({
  name,
  price,
  features,
  highlight,
  action,
  loading,
  actionLabel,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  action?: () => void;
  loading?: boolean;
  actionLabel?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card p-6 sm:p-8 flex flex-col",
        highlight && "ring-2 ring-brand-500/40 shadow-glow scale-[1.02] sm:scale-105 relative"
      )}
    >
      {highlight ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
          Популярный
        </span>
      ) : null}
      <h2 className="text-xl font-bold">{name}</h2>
      <p className="text-3xl font-mono font-bold my-4 text-brand-700 dark:text-brand-300">
        {price}
      </p>
      <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-400 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      {action && actionLabel ? (
        <button
          type="button"
          onClick={action}
          disabled={loading}
          className={cn(
            "w-full disabled:opacity-50",
            highlight ? "btn-primary" : "btn-secondary"
          )}
        >
          {highlight ? <Sparkles className="h-4 w-4" /> : null}
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
