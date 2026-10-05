ALTER TABLE public.found_items ADD COLUMN office_location text;
GRANT UPDATE (office_location) ON public.found_items TO authenticated;

ALTER TABLE public.claims ADD COLUMN status text NOT NULL DEFAULT 'pendiente';
ALTER TABLE public.claims ADD COLUMN reject_reason text;
ALTER TABLE public.claims ADD COLUMN reviewed_at timestamptz;
ALTER TABLE public.claims ADD CONSTRAINT claims_status_check CHECK (status IN ('pendiente', 'aceptado', 'rechazado'));

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  recipient_ci text NOT NULL,
  identity_checked boolean NOT NULL DEFAULT true,
  delivered_by uuid NOT NULL DEFAULT auth.uid(),
  delivered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Encargado deliveries select" ON public.deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'encargado'));

CREATE OR REPLACE FUNCTION public.assert_encargado()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'encargado') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_summary()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_encargado();
  RETURN json_build_object(
    'stored', (SELECT count(*) FROM public.found_items WHERE status IN ('disponible', 'en_revision')),
    'to_receive', (SELECT count(*) FROM public.found_items WHERE status = 'por_recibir'),
    'pending_claims', (SELECT count(*) FROM public.claims WHERE status = 'pendiente'),
    'delivered_month', (SELECT count(*) FROM public.deliveries WHERE delivered_at >= date_trunc('month', now()))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_items()
RETURNS TABLE (id uuid, name text, category text, description text, color text, location text,
  found_date date, photo_path text, status public.item_status, office_location text, created_at timestamptz,
  finder_name text, finder_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_encargado();
  RETURN QUERY
  SELECT f.id, f.name, f.category, f.description, f.color, f.location, f.found_date, f.photo_path,
    f.status, f.office_location, f.created_at, p.full_name, u.email::text
  FROM public.found_items f
  LEFT JOIN public.profiles p ON p.id = f.finder_id
  LEFT JOIN auth.users u ON u.id = f.finder_id
  ORDER BY f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_claims()
RETURNS TABLE (id uuid, item_id uuid, status text, answer1 text, answer2 text, details text,
  reject_reason text, created_at timestamptz, claimant_name text, claimant_email text,
  item_name text, item_category text, item_description text, item_photo text, item_status public.item_status,
  private_detail text, question1 text, question2 text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_encargado();
  RETURN QUERY
  SELECT c.id, c.item_id, c.status, c.answer1, c.answer2, c.details, c.reject_reason, c.created_at,
    p.full_name, u.email::text, f.name, f.category, f.description, f.photo_path, f.status,
    s.private_detail, s.question1, s.question2
  FROM public.claims c
  JOIN public.found_items f ON f.id = c.item_id
  LEFT JOIN public.found_item_secrets s ON s.item_id = c.item_id
  LEFT JOIN public.profiles p ON p.id = c.claimant_id
  LEFT JOIN auth.users u ON u.id = c.claimant_id
  ORDER BY (c.status = 'pendiente') DESC, c.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_claim(_claim_id uuid, _accept boolean, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item uuid;
BEGIN
  PERFORM public.assert_encargado();
  IF NOT _accept AND coalesce(trim(_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  UPDATE public.claims SET status = CASE WHEN _accept THEN 'aceptado' ELSE 'rechazado' END,
    reject_reason = CASE WHEN _accept THEN NULL ELSE left(trim(_reason), 500) END,
    reviewed_at = now()
  WHERE id = _claim_id AND status = 'pendiente'
  RETURNING item_id INTO _item;
  IF _item IS NULL THEN RAISE EXCEPTION 'not_pending'; END IF;
  IF NOT _accept AND NOT EXISTS (
    SELECT 1 FROM public.claims WHERE item_id = _item AND status IN ('pendiente', 'aceptado')
  ) THEN
    UPDATE public.found_items SET status = 'disponible' WHERE id = _item AND status = 'en_revision';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_deliver(_item_id uuid, _name text, _ci text, _claim_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_encargado();
  IF coalesce(trim(_name), '') = '' THEN RAISE EXCEPTION 'name_required'; END IF;
  IF coalesce(trim(_ci), '') = '' THEN RAISE EXCEPTION 'ci_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.found_items WHERE id = _item_id AND status <> 'entregado') THEN
    RAISE EXCEPTION 'not_deliverable';
  END IF;
  INSERT INTO public.deliveries (item_id, claim_id, recipient_name, recipient_ci, delivered_by)
  VALUES (_item_id, _claim_id, left(trim(_name), 120), left(trim(_ci), 30), auth.uid());
  UPDATE public.found_items SET status = 'entregado' WHERE id = _item_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_encargado(), public.admin_summary(), public.admin_list_items(),
  public.admin_list_claims(), public.admin_review_claim(uuid, boolean, text),
  public.admin_deliver(uuid, text, text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.assert_encargado(), public.admin_summary(), public.admin_list_items(),
  public.admin_list_claims(), public.admin_review_claim(uuid, boolean, text),
  public.admin_deliver(uuid, text, text, uuid) TO authenticated;