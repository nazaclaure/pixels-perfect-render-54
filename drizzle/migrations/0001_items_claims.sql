CREATE TYPE public.item_status AS ENUM ('por_recibir', 'disponible', 'en_revision', 'entregado');

CREATE TABLE public.lost_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  color text,
  location text NOT NULL,
  lost_date date NOT NULL,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_reports TO authenticated;
GRANT ALL ON public.lost_reports TO service_role;
ALTER TABLE public.lost_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own lost select" ON public.lost_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'encargado'));
CREATE POLICY "Own lost insert" ON public.lost_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own lost update" ON public.lost_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own lost delete" ON public.lost_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finder_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  color text,
  location text NOT NULL,
  found_date date NOT NULL,
  photo_path text NOT NULL,
  status public.item_status NOT NULL DEFAULT 'por_recibir',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, name, category, color, location, found_date, photo_path, status, created_at) ON public.found_items TO anon, authenticated;
GRANT INSERT (id, finder_id, name, category, description, color, location, found_date, photo_path) ON public.found_items TO authenticated;
GRANT UPDATE (status) ON public.found_items TO authenticated;
GRANT ALL ON public.found_items TO service_role;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public visible items" ON public.found_items FOR SELECT TO anon, authenticated
  USING (status <> 'por_recibir' OR finder_id = auth.uid() OR public.has_role(auth.uid(), 'encargado'));
CREATE POLICY "Finder insert" ON public.found_items FOR INSERT TO authenticated
  WITH CHECK (finder_id = auth.uid() AND status = 'por_recibir');
CREATE POLICY "Encargado update" ON public.found_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'encargado')) WITH CHECK (public.has_role(auth.uid(), 'encargado'));
CREATE INDEX found_items_status_created ON public.found_items (status, created_at DESC);

CREATE TABLE public.found_item_secrets (
  item_id uuid PRIMARY KEY REFERENCES public.found_items(id) ON DELETE CASCADE,
  private_detail text,
  question1 text,
  question2 text
);
GRANT SELECT, INSERT ON public.found_item_secrets TO authenticated;
GRANT ALL ON public.found_item_secrets TO service_role;
ALTER TABLE public.found_item_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Secrets finder or encargado select" ON public.found_item_secrets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'encargado') OR EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = item_id AND f.finder_id = auth.uid()));
CREATE POLICY "Secrets finder insert" ON public.found_item_secrets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = item_id AND f.finder_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_item_questions(_item_id uuid)
RETURNS TABLE (question1 text, question2 text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.question1, s.question2 FROM public.found_item_secrets s
  JOIN public.found_items f ON f.id = s.item_id
  WHERE s.item_id = _item_id AND f.status IN ('disponible', 'en_revision') AND auth.uid() IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.get_item_questions(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_item_questions(uuid) TO authenticated;

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  claimant_id uuid NOT NULL DEFAULT auth.uid(),
  answer1 text,
  answer2 text,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, claimant_id)
);
GRANT SELECT, INSERT ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or encargado claims select" ON public.claims FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR public.has_role(auth.uid(), 'encargado'));
CREATE POLICY "Claim insert" ON public.claims FOR INSERT TO authenticated
  WITH CHECK (claimant_id = auth.uid() AND EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = item_id AND f.status IN ('disponible', 'en_revision')));

CREATE OR REPLACE FUNCTION public.on_claim_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.found_items SET status = 'en_revision' WHERE id = NEW.item_id AND status = 'disponible';
  RETURN NEW;
END;
$$;
CREATE TRIGGER claims_set_review AFTER INSERT ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.on_claim_created();

CREATE POLICY "Item photos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'item-photos');
CREATE POLICY "Item photos own upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);