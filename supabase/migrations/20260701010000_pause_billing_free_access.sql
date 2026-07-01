UPDATE public.profiles
SET
  is_complimentary = true,
  complimentary_note = COALESCE(complimentary_note, 'Temporary free access while billing is paused'),
  subscription_status = 'active',
  trial_ends_at = NULL,
  subscription_updated_at = now()
WHERE is_complimentary IS DISTINCT FROM true;

UPDATE public.billing_accounts
SET
  is_complimentary = true,
  complimentary_note = COALESCE(complimentary_note, 'Temporary free access while billing is paused'),
  subscription_status = 'active',
  trial_ends_at = NULL,
  current_period_ends_at = NULL,
  updated_at = now()
WHERE is_complimentary IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    is_complimentary,
    complimentary_note,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    true,
    'Temporary free access while billing is paused',
    'active',
    NULL
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;
