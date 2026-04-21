CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'expired',
  'incomplete',
  'incomplete_expired',
  'not_started'
);

ALTER TABLE public.profiles
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
  ADD COLUMN subscription_price_id TEXT,
  ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN current_period_ends_at TIMESTAMPTZ,
  ADD COLUMN subscription_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.profiles
SET
  subscription_status = 'active',
  trial_ends_at = NULL,
  subscription_updated_at = now()
WHERE created_at < now();

CREATE TABLE public.billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_invoice_status TEXT,
  last_payment_error TEXT,
  last_checkout_session_id TEXT,
  raw_customer JSONB,
  raw_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own billing account" ON public.billing_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.kiosk_sessions (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daycare_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kiosk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own kiosk sessions" ON public.kiosk_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Anon can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Anon can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Anon can read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Anon can read children for kiosk" ON public.children;

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
BEGIN
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
    raw_subscription
  )
  VALUES (
    _user_id,
    _stripe_customer_id,
    _stripe_subscription_id,
    _stripe_price_id,
    _subscription_status,
    _trial_ends_at,
    _current_period_ends_at,
    COALESCE(_cancel_at_period_end, false),
    _last_invoice_status,
    _last_payment_error,
    _last_checkout_session_id,
    _raw_customer,
    _raw_subscription
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
    updated_at = now();

  UPDATE public.profiles
  SET
    stripe_customer_id = COALESCE(_stripe_customer_id, stripe_customer_id),
    subscription_status = _subscription_status,
    subscription_price_id = _stripe_price_id,
    trial_ends_at = _trial_ends_at,
    current_period_ends_at = _current_period_ends_at,
    subscription_updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_kiosk_session(daycare_name_override TEXT DEFAULT NULL)
RETURNS TABLE (
  token UUID,
  daycare_name TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_daycare_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.user_has_billing_access(auth.uid()) THEN
    RAISE EXCEPTION 'Active billing required to use kiosk mode';
  END IF;

  DELETE FROM public.kiosk_sessions
  WHERE provider_id = auth.uid()
    AND (revoked_at IS NOT NULL OR expires_at <= now());

  SELECT COALESCE(NULLIF(TRIM(daycare_name_override), ''), daycare_name, provider_name, 'Kindred Kids')
  INTO next_daycare_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  RETURN QUERY
  INSERT INTO public.kiosk_sessions (provider_id, daycare_name)
  VALUES (auth.uid(), next_daycare_name)
  RETURNING kiosk_sessions.token, kiosk_sessions.daycare_name, kiosk_sessions.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_list_children(session_token UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.parent_name
  FROM public.kiosk_sessions ks
  JOIN public.children c
    ON c.provider_id = ks.provider_id
  WHERE ks.token = session_token
    AND ks.revoked_at IS NULL
    AND ks.expires_at > now()
    AND public.user_has_billing_access(ks.provider_id)
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_get_child_state(session_token UUID, child_uuid UUID, entered_pin TEXT)
RETURNS TABLE (
  id UUID,
  check_in_am TIMESTAMPTZ,
  check_out_am TIMESTAMPTZ,
  check_in_pm TIMESTAMPTZ,
  check_out_pm TIMESTAMPTZ,
  marked_absent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_provider_id UUID;
BEGIN
  SELECT provider_id
  INTO session_provider_id
  FROM public.kiosk_sessions
  WHERE token = session_token
    AND revoked_at IS NULL
    AND expires_at > now();

  IF session_provider_id IS NULL OR NOT public.user_has_billing_access(session_provider_id) THEN
    RAISE EXCEPTION 'Kiosk session expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.children
    WHERE id = child_uuid
      AND provider_id = session_provider_id
      AND family_pin = entered_pin
  ) THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  RETURN QUERY
  SELECT a.id, a.check_in_am, a.check_out_am, a.check_in_pm, a.check_out_pm, a.marked_absent
  FROM public.attendance a
  WHERE a.child_id = child_uuid
    AND a.date = CURRENT_DATE
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_record_attendance(
  session_token UUID,
  child_uuid UUID,
  entered_pin TEXT,
  action_name TEXT
)
RETURNS TABLE (
  message TEXT,
  attendance_id UUID,
  check_in_am TIMESTAMPTZ,
  check_out_am TIMESTAMPTZ,
  check_in_pm TIMESTAMPTZ,
  check_out_pm TIMESTAMPTZ,
  marked_absent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_provider_id UUID;
  child_record public.children%ROWTYPE;
  attendance_record public.attendance%ROWTYPE;
  now_ts TIMESTAMPTZ := now();
  child_name TEXT;
BEGIN
  SELECT provider_id
  INTO session_provider_id
  FROM public.kiosk_sessions
  WHERE token = session_token
    AND revoked_at IS NULL
    AND expires_at > now();

  IF session_provider_id IS NULL OR NOT public.user_has_billing_access(session_provider_id) THEN
    RAISE EXCEPTION 'Kiosk session expired';
  END IF;

  SELECT *
  INTO child_record
  FROM public.children
  WHERE id = child_uuid
    AND provider_id = session_provider_id
    AND family_pin = entered_pin;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

  child_name := child_record.name;

  SELECT *
  INTO attendance_record
  FROM public.attendance
  WHERE child_id = child_uuid
    AND date = CURRENT_DATE
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.attendance (child_id, date)
    VALUES (child_uuid, CURRENT_DATE)
    RETURNING * INTO attendance_record;
  END IF;

  IF action_name = 'check_in_am' THEN
    attendance_record.check_in_am := now_ts;
    attendance_record.marked_absent := false;
    attendance_record.absence_reason := NULL;
  ELSIF action_name = 'check_out_am' THEN
    attendance_record.check_out_am := now_ts;
  ELSIF action_name = 'check_in_pm' THEN
    attendance_record.check_in_pm := now_ts;
  ELSIF action_name = 'check_out_pm' THEN
    attendance_record.check_out_pm := now_ts;
  ELSIF action_name = 'mark_absent' THEN
    attendance_record.marked_absent := true;
    attendance_record.absence_reason := NULL;
    attendance_record.check_in_am := NULL;
    attendance_record.check_out_am := NULL;
    attendance_record.check_in_pm := NULL;
    attendance_record.check_out_pm := NULL;
  ELSE
    RAISE EXCEPTION 'Unsupported action';
  END IF;

  UPDATE public.attendance
  SET
    check_in_am = attendance_record.check_in_am,
    check_out_am = attendance_record.check_out_am,
    check_in_pm = attendance_record.check_in_pm,
    check_out_pm = attendance_record.check_out_pm,
    marked_absent = attendance_record.marked_absent,
    absence_reason = attendance_record.absence_reason
  WHERE id = attendance_record.id
  RETURNING * INTO attendance_record;

  RETURN QUERY
  SELECT
    CASE
      WHEN action_name = 'mark_absent' THEN child_name || ' marked absent'
      WHEN action_name = 'check_out_am' THEN child_name || ' checked out for school'
      WHEN action_name = 'check_in_pm' THEN child_name || ' checked in from school'
      WHEN action_name = 'check_out_pm' THEN child_name || ' checked out'
      ELSE child_name || ' checked in'
    END,
    attendance_record.id,
    attendance_record.check_in_am,
    attendance_record.check_out_am,
    attendance_record.check_in_pm,
    attendance_record.check_out_pm,
    attendance_record.marked_absent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_billing_access(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_billing_state(UUID, TEXT, TEXT, TEXT, public.subscription_status, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, TEXT, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_kiosk_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kiosk_list_children(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_child_state(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.kiosk_record_attendance(UUID, UUID, TEXT, TEXT) TO authenticated, anon;

CREATE TRIGGER update_billing_accounts_updated_at
  BEFORE UPDATE ON public.billing_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
