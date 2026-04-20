ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS total_hours,
  DROP COLUMN IF EXISTS validation_flag;

ALTER TABLE public.monthly_sheets
  DROP COLUMN IF EXISTS pdf_url;
