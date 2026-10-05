import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, MapPin, Pencil, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, COLORS, LOCATIONS, PUBLIC_ITEM_COLUMNS, formatDate, signPhotos, todayISO, type PublicItem } from "@/lib/items";
import { ItemCard } from "@/components/items/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOST_STATUS } from "./mis-reportes";

export const Route = createFileRoute("/_authenticated/reporte/$id")({
  head: () => ({
    meta: [
      { title: "Mi reporte — UCBFound" },
      { name: "description", content: "Revisa tu reporte y las posibles coincidencias." },
      { property: "og:title", content: "Mi reporte — UCBFound" },
      { property: "og:description", content: "Revisa tu reporte y las posibles coincidencias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reporte,
});

const selectCls = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Reporte() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lost-report", id],
    enabled: !!user,
    queryFn: async () => {
      const { data: report, error } = await supabase.from("lost_reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!report) return null;
      const { data: m } = await supabase.from("matches").select("found_item_id").eq("lost_report_id", id);
      const ids = (m ?? []).map((x) => x.found_item_id);
      let items: PublicItem[] = [];
      if (ids.length) {
        const { data: it } = await supabase.from("found_items").select(PUBLIC_ITEM_COLUMNS).in("id", ids).neq("status", "entregado");
        items = (it ?? []) as unknown as PublicItem[];
      }
      const photos = await signPhotos([...items.map((i) => i.photo_path), report.photo_path ?? ""]);
      return { report, items, photos };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lost-report", id] });
    qc.invalidateQueries({ queryKey: ["my-lost"] });
  };

  const close = async () => {
    setClosing(true);
    const { error } = await supabase.from("lost_reports").update({ status: "cerrado", closed_at: new Date().toISOString() }).eq("id", id);
    setClosing(false);
    if (error) return void toast.error("No se pudo cerrar. Intenta de nuevo.");
    toast.success("¡Qué bueno que lo encontraste!");
    refresh();
  };

  if (isLoading) return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-3xl bg-card" />;
  if (!data) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <p className="text-muted-foreground">No encontramos este reporte.</p>
        <Button asChild className="mt-4 rounded-xl"><Link to="/mis-reportes">Ver mis reportes</Link></Button>
      </div>
    );
  }
  const { report: r, items, photos } = data;
  const open = r.status === "abierto";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/mis-reportes" search={{ tab: "perdi" }} className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Mis reportes</Link>

      {editing ? (
        <EditForm report={r} onDone={() => { setEditing(false); refresh(); }} />
      ) : (
        <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${LOST_STATUS[r.status]?.className}`}>{LOST_STATUS[r.status]?.label}</span>
              <h1 className="mt-2 text-2xl font-extrabold text-primary">{r.name}</h1>
            </div>
            {r.photo_path && photos[r.photo_path] && <img src={photos[r.photo_path]} alt={r.name} className="h-20 w-20 rounded-xl object-cover" />}
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="flex items-center gap-1.5"><Tag className="h-4 w-4 text-secondary" />{r.category}{r.color ? ` · ${r.color}` : ""}</p>
            <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-secondary" />{r.location}</p>
            <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-secondary" />{formatDate(r.lost_date)}</p>
          </div>
          {r.description && <p className="rounded-xl bg-muted p-3 text-sm">{r.description}</p>}
          {open && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar</Button>
              <Button variant="secondary" className="h-11 rounded-xl font-semibold" onClick={close} disabled={closing}>
                {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Ya lo encontré
              </Button>
            </div>
          )}
        </div>
      )}

      {open && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary"><Sparkles className="h-5 w-5 text-secondary" /> Posibles coincidencias</h2>
          {items.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((i) => <ItemCard key={i.id} item={i} photoUrl={photos[i.photo_path]} />)}
            </div>
          ) : (
            <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">Aún no hay coincidencias. Te avisaremos si aparece algo parecido.</p>
          )}
        </section>
      )}
    </div>
  );
}

type Report = { id: string; name: string; category: string; color: string | null; location: string; lost_date: string; description: string | null };

function EditForm({ report, onDone }: { report: Report; onDone: () => void }) {
  const [f, setF] = useState({
    name: report.name, category: report.category, color: report.color ?? "", location: report.location,
    date: report.lost_date, description: report.description ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim() || !f.category || !f.location || !f.date) return setError("Completa los campos obligatorios");
    if (f.date > todayISO()) return setError("La fecha no puede ser futura");
    setBusy(true);
    const { error: err } = await supabase.from("lost_reports").update({
      name: f.name.trim().slice(0, 100), category: f.category, color: f.color || null, location: f.location,
      lost_date: f.date, description: f.description.trim().slice(0, 1000) || null,
    }).eq("id", report.id);
    setBusy(false);
    if (err) return setError("No se pudo guardar. Intenta de nuevo.");
    toast.success("Reporte actualizado");
    onDone();
  };

  return (
    <form onSubmit={save} noValidate className="space-y-3 rounded-3xl bg-card p-5 shadow-soft sm:p-6">
      <h1 className="text-xl font-extrabold text-primary">Editar reporte</h1>
      <div className="space-y-1.5"><Label htmlFor="n">Nombre del objeto *</Label><Input id="n" value={f.name} onChange={set("name")} maxLength={100} className="h-11 rounded-xl" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="c">Tipo *</Label><select id="c" value={f.category} onChange={set("category")} className={selectCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="co">Color</Label><select id="co" value={f.color} onChange={set("color")} className={selectCls}><option value="">Elige</option>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="l">Dónde lo perdiste *</Label><select id="l" value={f.location} onChange={set("location")} className={selectCls}>{LOCATIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="d">Fecha *</Label><input id="d" type="date" max={todayISO()} value={f.date} onChange={set("date")} className={selectCls} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="de">Descripción</Label><Textarea id="de" value={f.description} onChange={set("description")} rows={3} maxLength={1000} className="rounded-xl" /></div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={busy} className="h-11 rounded-xl">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
      </div>
    </form>
  );
}
