import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, CalendarDays, Tag, Palette, Hand, PackageCheck, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PUBLIC_ITEM_COLUMNS, formatDate, signPhotos, OFFICE, type PublicItem } from "@/lib/items";
import { StatusBadge } from "@/components/items/ItemCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/objeto/$id")({
  head: () => ({
    meta: [
      { title: "Objeto encontrado — UCBFound" },
      { name: "description", content: "Revisa este objeto encontrado en la UCB y reclámalo si es tuyo." },
      { property: "og:title", content: "Objeto encontrado — UCBFound" },
      { property: "og:description", content: "Revisa este objeto encontrado en la UCB y reclámalo si es tuyo." },
    ],
  }),
  component: Detalle,
});

function Detalle() {
  const { id } = Route.useParams();
  const { role, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["item", id, role],
    enabled: !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase.from("found_items").select(PUBLIC_ITEM_COLUMNS).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const item = data as PublicItem;
      const photos = await signPhotos([item.photo_path]);
      return { item, photo: photos[item.photo_path] };
    },
  });

  const confirmReception = async () => {
    setConfirming(true);
    const { error } = await supabase.from("found_items").update({ status: "disponible" }).eq("id", id);
    setConfirming(false);
    if (error) return void toast.error("No se pudo confirmar. Intenta de nuevo.");
    toast.success("Recepción confirmada. Ya está disponible.");
    qc.invalidateQueries();
  };

  if (isLoading || authLoading) return <div className="mx-auto aspect-square max-w-xl animate-pulse rounded-3xl bg-card" />;
  if (!data) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <p className="font-semibold text-primary">No encontramos este objeto.</p>
        <Button asChild className="mt-4 rounded-xl"><Link to="/buscar">Volver a buscar</Link></Button>
      </div>
    );
  }
  const { item, photo } = data;
  const canClaim = item.status === "disponible" || item.status === "en_revision";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/buscar" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Volver</Link>
      <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
        <div className="aspect-square bg-muted">
          {photo ? <img src={photo} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="h-10 w-10" /></div>}
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-extrabold text-primary">{item.name}</h1>
            <StatusBadge status={item.status} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              [Tag, "Tipo", item.category],
              [MapPin, "Lugar", item.location],
              [CalendarDays, "Fecha", formatDate(item.found_date)],
              [Palette, "Color", item.color ?? "—"],
            ].map(([Icon, l, v]) => {
              const I = Icon as typeof Tag;
              return (
                <div key={l as string} className="rounded-xl bg-muted p-3">
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><I className="h-3.5 w-3.5" />{l as string}</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{v as string}</dd>
                </div>
              );
            })}
          </dl>
          <p className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">
            Se recoge en la {OFFICE.name}. {OFFICE.hours}.
          </p>

          {role === "encargado" && item.status === "por_recibir" && (
            <Button onClick={confirmReception} disabled={confirming} variant="secondary" className="h-12 w-full rounded-xl text-base font-semibold">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-5 w-5" />} Confirmar recepción
            </Button>
          )}
          {canClaim && (
            <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
              <Link to="/reclamar/$id" params={{ id: item.id }}><Hand className="h-5 w-5" /> Es mío, quiero reclamarlo</Link>
            </Button>
          )}
          {item.status === "entregado" && <p className="text-center text-sm text-muted-foreground">Este objeto ya fue entregado a su dueño.</p>}
        </div>
      </div>
    </div>
  );
}
