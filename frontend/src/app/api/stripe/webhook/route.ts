import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/shared/lib/supabase/server";

/** Handles Stripe webhook for Pro and skin purchases. */
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const type = session.metadata?.type;
    if (!userId) return NextResponse.json({ received: true });

    const supabase = createServiceClient();
    if (type === "pro") {
      await supabase
        .from("profiles")
        .update({ is_pro: true })
        .eq("id", userId);
    }
    if (type === "skin") {
      const { data } = await supabase
        .from("profiles")
        .select("owned_skins")
        .eq("id", userId)
        .single();
      const skins = [...(data?.owned_skins ?? []), "neon"];
      await supabase
        .from("profiles")
        .update({ owned_skins: skins })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
