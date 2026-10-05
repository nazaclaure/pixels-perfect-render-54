import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PUBLIC_ITEM_COLUMNS, signPhotos, type PublicItem } from "@/lib/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/reclamar/$id")({
  head: () => ({
    meta: [
      { title: "Reclamar objeto — UCBFound" },
      { name: "description", content: "Demuestra que el objeto es tuyo para recuperarlo." },
      { property: "og:title", content: "Reclamar objeto — UCBFound" },
      { property: "og:description", content: "Demuestra que el objeto es tuyo para recuperarlo." },
    ],
  }),
  component: Reclamar,
});

const DUPLICATE = "Ya enviaste una solicitud para este objeto.";

function Reclamar() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["claim-form", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [itemRes, qRes, claimRes] = await Promise.all([
        supabase.from("found_items").select(PUBLIC_ITEM_COLUMNS).eq("id", id).maybeSingle(),
        supabase.rpc("get_item_questions", { _item_id: id }),
        supabase.from("claims").select("id").eq("item_id", id).eq("claimant_id", user!.id).maybeSingle(),
      ]);
      const item = itemRes.data as PublicItem | null;
      const photos = item ? await signPhotos([item.photo_path]) : {};
      return {
        item,
        photo: item ? photos[item.photo_path] : undefined,
        questions: qRes.data?.[0] ?? null,
        already: !!claimRes.data,
      };
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!details.trim()) return setError("Describe algún detalle del objeto");
    if (data?.questions?.question1 && !a1.trim()) return setError("Responde las preguntas");
    if (data?.questions?.question2 && !a2.trim()) return setError("Responde las preguntas");
    setBusy(true);
    const { error } = await supabase.from("claims").insert({
      item_id: id,
      claimant_id: user!.id,
      answer1: a1.trim().slice(0, 300) || null,
      answer2: a2.trim().slice(0, 300) || null,
      details: details.trim().slice(0, 1000),
    });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? DUPLICATE : "No se pudo enviar. Intenta de nuevo.");
    setDone(true);
  };

  if (isLoading || !data) return <div className="mx-auto h-96 max-w-xl animate-pulse rounded-3xl bg-card" />;
  const { item, photo, questions, already } = data;
  const claimable = item && (item.status === "disponible" || item.status === "en_revision");

  if (done || already || !claimable) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        {done ? <CheckCircle2 className="mx-auto h-14 w-14 text-status-success-foreground" /> : <Info className="mx-auto h-12 w-12 text-secondary" />}
        <p className="mt-4 text-lg font-semibold text-primary">
          {done ? "Tu reclamo fue enviado. El encargado lo revisará." : already ? DUPLICATE : "Este objeto no se puede reclamar."}
        </p>
        <Button asChild className="mt-6 h-11 rounded-xl"><Link to="/buscar">Volver a buscar</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/objeto/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Volver</Link>
      <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
        {photo && <img src={photo} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Vas a reclamar</p>
          <p className="truncate font-bold text-primary">{item.name}</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl bg-card p-5 shadow-soft sm:p-6">
        <h1 className="text-xl font-extrabold text-primary">Demuestra que es tuyo</h1>
        {questions?.question1 && (
          <div className="space-y-1.5">
            <Label htmlFor="a1">{questions.question1}</Label>
            <Input id="a1" value={a1} onChange={(e) => setA1(e.target.value)} maxLength={300} className="h-11 rounded-xl" />
          </div>
        )}
        {questions?.question2 && (
          <div className="space-y-1.5">
            <Label htmlFor="a2">{questions.question2}</Label>
            <Input id="a2" value={a2} onChange={(e) => setA2(e.target.value)} maxLength={300} className="h-11 rounded-xl" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="det">Detalles que solo el dueño sabría <span className="text-destructive">*</span></Label>
          <Textarea id="det" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={4} placeholder="Marcas, rayones, contenido, stickers..." className="rounded-xl" />
        </div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar reclamo
        </Button>
      </form>
    </div>
  );
}
