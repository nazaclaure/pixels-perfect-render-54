import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarDays, ChevronRight, ImageOff, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PUBLIC_ITEM_COLUMNS, formatDate, signPhotos, type ItemStatus, type PublicItem } from "@/lib/items";
import { StatusBadge } from "@/components/items/ItemCard";
import { Button } from "@/components/ui/button";

const TABS = [
  ["perdi", "Lo que perdí"],
  ["encontre", "Lo que encontré"],
  ["reclamos", "Mis reclamos"],
] as const;
type Tab = (typeof TABS)[number][0];

export const Route = createFileRoute("/_authenticated/mis-reportes")({
  validateSearch: z.object({ tab: z.enum(["perdi", "encontre", "reclamos"]).optional() }),
  head: () => ({
    meta: [
      { title: "Mis reportes — UCBFound" },
      { name: "description", content: "Revisa lo que perdiste, lo que encontraste y tus reclamos." },
      { property: "og:title", content: "Mis reportes — UCBFound" },
      { property: "og:description", content: "Revisa lo que perdiste, lo que encontraste y tus reclamos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MisReportes,
});

export const LOST_STATUS: Record<string, { label: string; className: string }> = {
  abierto: { label: "Buscando", className: "bg-status-info text-status-info-foreground" },
  cerrado: { label: "Ya lo encontré", className: "bg-status-success text-status-success-foreground" },
};
const CLAIM_STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-status-warning text-status-warning-foreground" },
  aceptado: { label: "Aceptado", className: "bg-status-success text-status-success-foreground" },
  rechazado: { label: "Rechazado", className: "bg-destructive/10 text-destructive" },
};

function Pill({ s }: { s: { label: string; className: string } | undefined }) {
  if (!s) return null;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function Thumb({ url, alt }: { url?: string | undefined; alt: string }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
      {url ? <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><ImageOff className="h-5 w-5" /></div>}
    </div>
  );
}

const rowCls = "flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft transition hover:shadow-lift";

function MisReportes() {
  const { tab = "perdi" } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold text-primary">Mis reportes</h1>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1.5 shadow-soft">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => navigate({ to: "/mis-reportes", search: { tab: k }, replace: true })}
            className={`rounded-xl px-2 py-2.5 text-xs font-bold transition sm:text-sm ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "perdi" && <Lost />}
      {tab === "encontre" && <Found />}
      {tab === "reclamos" && <Claims />}
    </div>
  );
}

function Empty({ text, tab }: { text: string; tab: Tab }) {
  return (
    <div className="rounded-3xl bg-card p-8 text-center shadow-soft">
      <p className="text-muted-foreground">{text}</p>
      {tab !== "reclamos" && (
        <Button asChild className="mt-4 h-11 rounded-xl">
          <Link to="/reportar" search={{ tipo: tab === "perdi" ? "perdido" : "encontrado" }}><Plus className="h-4 w-4" /> Reportar</Link>
        </Button>
      )}
    </div>
  );
}

const Skeleton = () => <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-card" />)}</div>;

function Lost() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-lost", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lost_reports")
        .select("id, name, category, location, lost_date, photo_path, status, matches(count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const photos = await signPhotos(data.map((r) => r.photo_path ?? ""));
      return data.map((r) => ({ ...r, url: r.photo_path ? photos[r.photo_path] : undefined, count: (r.matches as unknown as { count: number }[])[0]?.count ?? 0 }));
    },
  });
  if (isLoading) return <Skeleton />;
  if (!data?.length) return <Empty text="No reportaste objetos perdidos." tab="perdi" />;
  return (
    <ul className="space-y-2">
      {data.map((r) => (
        <li key={r.id}>
          <Link to="/reporte/$id" params={{ id: r.id }} className={rowCls}>
            <Thumb url={r.url} alt={r.name} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-bold text-primary">{r.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{r.location} · <CalendarDays className="h-3.5 w-3.5" />{formatDate(r.lost_date)}</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill s={LOST_STATUS[r.status]} />
                {r.status === "abierto" && r.count > 0 && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {r.count} {r.count === 1 ? "coincidencia" : "coincidencias"}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Found() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-found", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("found_items")
        .select(PUBLIC_ITEM_COLUMNS)
        .eq("finder_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const items = data as unknown as PublicItem[];
      const photos = await signPhotos(items.map((i) => i.photo_path));
      return items.map((i) => ({ ...i, url: photos[i.photo_path] }));
    },
  });
  if (isLoading) return <Skeleton />;
  if (!data?.length) return <Empty text="No registraste objetos encontrados." tab="encontre" />;
  return (
    <ul className="space-y-2">
      {data.map((i) => (
        <li key={i.id}>
          <Link to="/objeto/$id" params={{ id: i.id }} className={rowCls}>
            <Thumb url={i.url} alt={i.name} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-bold text-primary">{i.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{i.location} · {formatDate(i.found_date)}</p>
              <StatusBadge status={i.status} />
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Claims() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, status, reject_reason, created_at, item_id, found_items(name, photo_path, status)")
        .eq("claimant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data as unknown as { id: string; status: string; reject_reason: string | null; created_at: string; item_id: string; found_items: { name: string; photo_path: string; status: ItemStatus } | null }[];
      const photos = await signPhotos(rows.map((r) => r.found_items?.photo_path ?? ""));
      return rows.map((r) => ({ ...r, url: r.found_items ? photos[r.found_items.photo_path] : undefined }));
    },
  });
  if (isLoading) return <Skeleton />;
  if (!data?.length) return <Empty text="No enviaste reclamos." tab="reclamos" />;
  return (
    <ul className="space-y-2">
      {data.map((c) => (
        <li key={c.id}>
          <Link to="/objeto/$id" params={{ id: c.item_id }} className={rowCls}>
            <Thumb url={c.url} alt={c.found_items?.name ?? "Objeto"} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-bold text-primary">{c.found_items?.name ?? "Objeto"}</p>
              <p className="text-xs text-muted-foreground">Enviado el {formatDate(c.created_at)}</p>
              <Pill s={CLAIM_STATUS[c.status]} />
              {c.status === "rechazado" && c.reject_reason && <p className="text-xs text-muted-foreground">Motivo: {c.reject_reason}</p>}
              {c.status === "aceptado" && c.found_items?.status !== "entregado" && <p className="text-xs font-medium text-primary">Listo para recoger en la oficina</p>}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
