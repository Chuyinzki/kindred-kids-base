import Stripe from "npm:stripe@18.4.0";
import { corsHeaders } from "../_shared/cors.ts";
import {
  asIsoOrNull,
  getUserIdForCustomer,
  mapStripeSubscriptionStatus,
  stripe,
  supabaseAdmin,
} from "../_shared/stripe.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") ?? "";

const syncSubscription = async ({
  userId,
  customerId,
  subscription,
  invoiceStatus = null,
  paymentError = null,
  customer,
}: {
  userId: string;
  customerId: string;
  subscription: Stripe.Subscription;
  invoiceStatus?: string | null;
  paymentError?: string | null;
  customer: Stripe.Customer | Stripe.DeletedCustomer;
}) => {
  const priceId = subscription.items.data[0]?.price?.id ?? null;

  await supabaseAdmin.rpc("sync_billing_state", {
    _user_id: userId,
    _stripe_customer_id: customerId,
    _stripe_subscription_id: subscription.id,
    _stripe_price_id: priceId,
    _subscription_status: mapStripeSubscriptionStatus(subscription.status),
    _trial_ends_at: asIsoOrNull(subscription.trial_end),
    _current_period_ends_at: asIsoOrNull(subscription.current_period_end),
    _cancel_at_period_end: subscription.cancel_at_period_end,
    _last_invoice_status: invoiceStatus,
    _last_payment_error: paymentError,
    _last_checkout_session_id: null,
    _raw_customer: customer,
    _raw_subscription: subscription,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (!customerId) break;
        const { userId, customer } = await getUserIdForCustomer(customerId);
        if (!userId) break;

        await supabaseAdmin
          .from("billing_accounts")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
            last_checkout_session_id: session.id,
            raw_customer: customer,
          }, { onConflict: "user_id" });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const { userId, customer } = await getUserIdForCustomer(customerId);
        if (!userId) break;
        await syncSubscription({ userId, customerId, subscription, customer });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId || !invoice.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id,
        );
        const { userId, customer } = await getUserIdForCustomer(customerId);
        if (!userId) break;
        await syncSubscription({
          userId,
          customerId,
          subscription,
          invoiceStatus: invoice.status,
          paymentError: invoice.last_finalization_error?.message ?? "Payment failed",
          customer,
        });
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId || !invoice.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(
          typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id,
        );
        const { userId, customer } = await getUserIdForCustomer(customerId);
        if (!userId) break;
        await syncSubscription({
          userId,
          customerId,
          subscription,
          invoiceStatus: invoice.status,
          paymentError: null,
          customer,
        });
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Webhook failed",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
