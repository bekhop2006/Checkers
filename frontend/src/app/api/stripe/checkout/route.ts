import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/shared/lib/supabase/server";

/** Creates Stripe Checkout session for Pro or skin. */
export async function POST(request: Request) {
  const { type } = (await request.json()) as { type: "pro" | "skin" };

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      message:
        "Demo mode: add STRIPE_SECRET_KEY for real checkout. Pro unlock is manual in Supabase.",
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId =
    type === "pro"
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_SKIN_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: type === "pro" ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId: user.id, type },
  });

  return NextResponse.json({ url: session.url });
}
