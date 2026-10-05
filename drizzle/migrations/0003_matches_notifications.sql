ALTER TABLE public.lost_reports
  ADD COLUMN status text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','cerrado')),
  ADD COLUMN closed_at timestamptz;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notif select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notif update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notif delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_report_id uuid NOT NULL REFERENCES public.lost_reports(id) ON DELETE CASCADE,
  found_item_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lost_report_id, found_item_id)
);
GRANT SELECT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own matches select" ON public.matches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lost_reports l WHERE l.id = lost_report_id AND (l.user_id = auth.uid() OR public.has_role(auth.uid(), 'encargado'))));

CREATE OR REPLACE FUNCTION public.locations_near(a text, b text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT a = b OR EXISTS (
    SELECT 1 FROM (VALUES
      ('Bloque A','Bloque B'),('Bloque B','Bloque C'),('Bloque A','Biblioteca'),('Bloque B','Biblioteca'),
      ('Cafetería','Canchas'),('Cafetería','Bloque C'),('Canchas','Estacionamiento'),
      ('Auditorio','Bloque C'),('Auditorio','Estacionamiento')
    ) v(x, y) WHERE (x = a AND y = b) OR (x = b AND y = a))
$$;

CREATE OR REPLACE FUNCTION public.create_matches(_item_id uuid, _report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  WITH new_matches AS (
    INSERT INTO public.matches (lost_report_id, found_item_id)
    SELECT l.id, f.id
    FROM public.found_items f
    JOIN public.lost_reports l
      ON l.category = f.category AND l.status = 'abierto'
     AND public.locations_near(l.location, f.location)
     AND abs(l.lost_date - f.found_date) <= 7
     AND l.user_id <> f.finder_id
    WHERE f.status IN ('disponible', 'en_revision')
      AND (_item_id IS NULL OR f.id = _item_id)
      AND (_report_id IS NULL OR l.id = _report_id)
    ON CONFLICT DO NOTHING
    RETURNING lost_report_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT l.user_id, 'coincidencia', 'Encontraron un objeto parecido a tu ' || l.name,
    'Revisa las posibles coincidencias en tu reporte.', '/reporte/' || l.id
  FROM (SELECT DISTINCT lost_report_id FROM new_matches) n
  JOIN public.lost_reports l ON l.id = n.lost_report_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_matches(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_item_available()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'disponible' AND (TG_OP = 'INSERT' OR OLD.status = 'por_recibir') THEN
    PERFORM public.create_matches(NEW.id, NULL);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER found_items_match AFTER INSERT OR UPDATE OF status ON public.found_items
  FOR EACH ROW EXECUTE FUNCTION public.on_item_available();

CREATE OR REPLACE FUNCTION public.on_lost_report_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_matches(NULL, NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER lost_reports_match AFTER INSERT ON public.lost_reports
  FOR EACH ROW EXECUTE FUNCTION public.on_lost_report_created();

CREATE OR REPLACE FUNCTION public.on_claim_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT name INTO _name FROM public.found_items WHERE id = NEW.item_id;
  IF NEW.status = 'aceptado' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link) VALUES
      (NEW.claimant_id, 'reclamo_aceptado', 'Tu reclamo de ' || _name || ' fue aceptado', 'El encargado confirmó que el objeto es tuyo.', '/objeto/' || NEW.item_id),
      (NEW.claimant_id, 'listo', 'Tu ' || _name || ' está listo para recoger', 'Oficina de Bienestar Estudiantil, lunes a viernes de 8:00 a 18:00. Lleva tu carnet.', '/objeto/' || NEW.item_id);
  ELSIF NEW.status = 'rechazado' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link) VALUES
      (NEW.claimant_id, 'reclamo_rechazado', 'Tu reclamo de ' || _name || ' fue rechazado', NEW.reject_reason, '/objeto/' || NEW.item_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER claims_notify AFTER UPDATE OF status ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.on_claim_reviewed();