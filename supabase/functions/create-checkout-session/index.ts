import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { appUrl, starterPriceId, stripe, supabaseAdmin } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!starterPriceId) {
      throw new Error("Missing STRIPE_PRICE_ID_STARTER environment variable");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("daycare_name, provider_name, stripe_customer_id, subscription_status, trial_ends_at, is_complimentary")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Unable to load provider profile");
    }

    if (profile.is_complimentary) {
      throw new Error("This provider account is marked as complimentary and does not need billing.");
    }

    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile.daycare_name || profile.provider_name || user.email || "Kindred Kids Provider",
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      await supabaseAdmin.rpc("sync_billing_state", {
        _user_id: user.id,
        _stripe_customer_id: stripeCustomerId,
        _stripe_subscription_id: null,
        _stripe_price_id: starterPriceId,
        _subscription_status: profile.subscription_status,
        _trial_ends_at: profile.trial_ends_at,
        _current_period_ends_at: null,
        _cancel_at_period_end: false,
        _last_invoice_status: null,
        _last_payment_error: null,
        _last_checkout_session_id: null,
        _raw_customer: customer,
        _raw_subscription: null,
      });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const trialEnd = profile.trial_ends_at ? Math.floor(new Date(profile.trial_ends_at).getTime() / 1000) : null;
    const shouldHonorTrial = profile.subscription_status === "trialing" && trialEnd && trialEnd > nowSeconds;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: starterPriceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success`,
      cancel_url: `${appUrl}/settings?checkout=canceled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: shouldHonorTrial ? { trial_end: trialEnd } : undefined,
      metadata: {
        user_id: user.id,
      },
    });

    await supabaseAdmin
      .from("billing_accounts")
      .upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        stripe_price_id: starterPriceId,
        last_checkout_session_id: checkoutSession.id,
      }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unable to create checkout session",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
