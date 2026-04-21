ALTER TABLE public.profiles
  ADD COLUMN is_complimentary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN complimentary_note TEXT;

ALTER TABLE public.billing_accounts
  ADD COLUMN is_complimentary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN complimentary_note TEXT;

CREATE OR REPLACE FUNCTION public.user_has_billing_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF profile_record.is_complimentary THEN
    RETURN true;
  END IF;

  IF profile_record.subscription_status IN ('active', 'trialing', 'past_due') THEN
    RETURN true;
  END IF;

  IF profile_record.subscription_status = 'canceled' THEN
    RETURN profile_record.current_period_ends_at IS NULL OR profile_record.current_period_ends_at > now();
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_billing_state(
  _user_id UUID,
  _stripe_customer_id TEXT,
  _stripe_subscription_id TEXT,
  _stripe_price_id TEXT,
  _subscription_status public.subscription_status,
  _trial_ends_at TIMESTAMPTZ,
  _current_period_ends_at TIMESTAMPTZ,
  _cancel_at_period_end BOOLEAN,
  _last_invoice_status TEXT,
  _last_payment_error TEXT,
  _last_checkout_session_id TEXT,
  _raw_customer JSONB,
  _raw_subscription JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_is_complimentary BOOLEAN := false;
  profile_complimentary_note TEXT := NULL;
BEGIN
  SELECT is_complimentary, complimentary_note
  INTO profile_is_complimentary, profile_complimentary_note
  FROM public.profiles
  WHERE user_id = _user_id;

  INSERT INTO public.billing_accounts (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    subscription_status,
    trial_ends_at,
    current_period_ends_at,
    cancel_at_period_end,
    last_invoice_status,
    last_payment_error,
    last_checkout_session_id,
    raw_customer,
    raw_subscription,
    is_complimentary,
    complimentary_note
  )
  VALUES (
    _user_id,
    _stripe_customer_id,
    _stripe_subscription_id,
    _stripe_price_id,
    CASE WHEN profile_is_complimentary THEN 'active' ELSE _subscription_status END,
    CASE WHEN profile_is_complimentary THEN NULL ELSE _trial_ends_at END,
    CASE WHEN profile_is_complimentary THEN NULL ELSE _current_period_ends_at END,
    COALESCE(_cancel_at_period_end, false),
    _last_invoice_status,
    _last_payment_error,
    _last_checkout_session_id,
    _raw_customer,
    _raw_subscription,
    profile_is_complimentary,
    profile_complimentary_note
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_price_id = EXCLUDED.stripe_price_id,
    subscription_status = EXCLUDED.subscription_status,
    trial_ends_at = EXCLUDED.trial_ends_at,
    current_period_ends_at = EXCLUDED.current_period_ends_at,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    last_invoice_status = EXCLUDED.last_invoice_status,
    last_payment_error = EXCLUDED.last_payment_error,
    last_checkout_session_id = COALESCE(EXCLUDED.last_checkout_session_id, public.billing_accounts.last_checkout_session_id),
    raw_customer = COALESCE(EXCLUDED.raw_customer, public.billing_accounts.raw_customer),
    raw_subscription = COALESCE(EXCLUDED.raw_subscription, public.billing_accounts.raw_subscription),
    is_complimentary = EXCLUDED.is_complimentary,
    complimentary_note = EXCLUDED.complimentary_note,
    updated_at = now();

  UPDATE public.profiles
  SET
    stripe_customer_id = COALESCE(_stripe_customer_id, stripe_customer_id),
    subscription_status = CASE WHEN is_complimentary THEN 'active' ELSE _subscription_status END,
    subscription_price_id = CASE WHEN is_complimentary THEN NULL ELSE _stripe_price_id END,
    trial_ends_at = CASE WHEN is_complimentary THEN NULL ELSE _trial_ends_at END,
    current_period_ends_at = CASE WHEN is_complimentary THEN NULL ELSE _current_period_ends_at END,
    subscription_updated_at = now()
  WHERE user_id = _user_id;
END;
$$;
