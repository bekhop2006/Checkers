"use client";

import { useState } from "react";

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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-12">Тарифы</h1>
      <div className="grid md:grid-cols-3 gap-6">
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
      <p className="text-center text-stone-500 text-sm mt-8">
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
      className={`p-6 rounded-2xl border ${
        highlight
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 scale-105"
          : "border-stone-200 dark:border-stone-800"
      }`}
    >
      <h2 className="text-xl font-bold">{name}</h2>
      <p className="text-2xl font-mono my-4">{price}</p>
      <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400 mb-6">
        {features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
      {action && actionLabel && (
        <button
          type="button"
          onClick={action}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
