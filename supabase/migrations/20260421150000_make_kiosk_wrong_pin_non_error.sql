DROP FUNCTION IF EXISTS public.kiosk_get_child_state(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.kiosk_get_child_state(session_token UUID, child_uuid UUID, entered_pin TEXT)
RETURNS TABLE (
  pin_valid BOOLEAN,
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
  SELECT ks.provider_id
  INTO session_provider_id
  FROM public.kiosk_sessions AS ks
  WHERE ks.token = session_token
    AND ks.revoked_at IS NULL
    AND ks.expires_at > now();

  IF session_provider_id IS NULL OR NOT public.user_has_billing_access(session_provider_id) THEN
    RAISE EXCEPTION 'Kiosk session expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.children AS c
    WHERE c.id = child_uuid
      AND c.provider_id = session_provider_id
      AND c.family_pin = entered_pin
  ) THEN
    RETURN QUERY
    SELECT
      false,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    a.id,
    a.check_in_am,
    a.check_out_am,
    a.check_in_pm,
    a.check_out_pm,
    a.marked_absent
  FROM public.attendance AS a
  WHERE a.child_id = child_uuid
    AND a.date = CURRENT_DATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      true,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      false;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.kiosk_record_attendance(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.kiosk_record_attendance(
  session_token UUID,
  child_uuid UUID,
  entered_pin TEXT,
  action_name TEXT
)
RETURNS TABLE (
  pin_valid BOOLEAN,
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
  SELECT ks.provider_id
  INTO session_provider_id
  FROM public.kiosk_sessions AS ks
  WHERE ks.token = session_token
    AND ks.revoked_at IS NULL
    AND ks.expires_at > now();

  IF session_provider_id IS NULL OR NOT public.user_has_billing_access(session_provider_id) THEN
    RAISE EXCEPTION 'Kiosk session expired';
  END IF;

  SELECT c.*
  INTO child_record
  FROM public.children AS c
  WHERE c.id = child_uuid
    AND c.provider_id = session_provider_id
    AND c.family_pin = entered_pin;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      false,
      'Incorrect PIN'::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      false;
    RETURN;
  END IF;

  child_name := child_record.name;

  SELECT a.*
  INTO attendance_record
  FROM public.attendance AS a
  WHERE a.child_id = child_uuid
    AND a.date = CURRENT_DATE
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

  UPDATE public.attendance AS a
  SET
    check_in_am = attendance_record.check_in_am,
    check_out_am = attendance_record.check_out_am,
    check_in_pm = attendance_record.check_in_pm,
    check_out_pm = attendance_record.check_out_pm,
    marked_absent = attendance_record.marked_absent,
    absence_reason = attendance_record.absence_reason
  WHERE a.id = attendance_record.id
  RETURNING * INTO attendance_record;

  RETURN QUERY
  SELECT
    true,
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

GRANT EXECUTE ON FUNCTION public.kiosk_get_child_state(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.kiosk_record_attendance(UUID, UUID, TEXT, TEXT) TO authenticated, anon;
