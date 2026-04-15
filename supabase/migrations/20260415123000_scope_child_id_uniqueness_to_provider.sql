ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_child_id_number_key;

ALTER TABLE public.children
  ADD CONSTRAINT children_provider_id_child_id_number_key
  UNIQUE (provider_id, child_id_number);
