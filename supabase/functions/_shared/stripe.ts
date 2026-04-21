import Stripe from "npm:stripe@18.4.0";
import { createClient } from "npm:@supabase/supabase-js@2";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2025-03-31.basil",
});

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

export const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
export const starterPriceId = Deno.env.get("STRIPE_PRICE_ID_STARTER") ?? "";

export const asIsoOrNull = (value?: number | null) =>
  value ? new Date(value * 1000).toISOString() : null;

export const mapStripeSubscriptionStatus = (
  status?: Stripe.Subscription.Status | null,
): string => {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "paused":
      return "past_due";
    default:
      return "expired";
  }
};

export const getUserIdForCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId);
  const metadataUserId = !("deleted" in customer) ? customer.metadata?.user_id : null;
  if (metadataUserId) {
    return { userId: metadataUserId, customer };
  }

  const { data } = await supabaseAdmin
    .from("billing_accounts")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return { userId: data?.user_id ?? null, customer };
};
