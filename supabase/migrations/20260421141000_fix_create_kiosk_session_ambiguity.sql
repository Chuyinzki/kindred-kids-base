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

  DELETE FROM public.kiosk_sessions AS ks
  WHERE ks.provider_id = auth.uid()
    AND (ks.revoked_at IS NOT NULL OR ks.expires_at <= now());

  SELECT COALESCE(NULLIF(TRIM(daycare_name_override), ''), p.daycare_name, p.provider_name, 'Kindred Kids')
  INTO next_daycare_name
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid();

  RETURN QUERY
  INSERT INTO public.kiosk_sessions (provider_id, daycare_name)
  VALUES (auth.uid(), next_daycare_name)
  RETURNING kiosk_sessions.token, kiosk_sessions.daycare_name, kiosk_sessions.expires_at;
END;
$$;
