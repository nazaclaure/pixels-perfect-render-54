import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ClipboardList, PackageCheck, Loader2, Search, Check, X, Lock, MessageSquareText, IdCard, Inbox, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, formatDate, signPhotos, type ItemStatus } from "@/lib/items";
import { StatusBadge } from "@/components/items/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectCls = "h-10 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function useAdminItems() {
  return useQuery({
    queryKey: ["admin", "items"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_items");
      if (error) throw error;
      const photos = await signPhotos(data.map((i) => i.photo_path));
      return { items: data, photos };
    },
  });
}

function useAdminClaims() {
  return useQuery({
    queryKey: ["admin", "claims"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_claims");
      if (error) throw error;
      const photos = await signPhotos(data.map((c) => c.item_photo));
      return { claims: data, photos };
    },
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-soft">
      <Inbox className="mx-auto mb-2 h-8 w-8 text-secondary" />
      {text}
    </div>
  );
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
}

/* ---------- Resumen ---------- */
export function Summary() {
  const { data } = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_summary");
      if (error) throw error;
      return data as { stored: number; to_receive: number; pending_claims: number; delivered_month: number };
    },
  });
  const cards = [
    { label: "Objetos guardados", value: data?.stored, icon: Archive, cls: "bg-primary text-primary-foreground" },
    { label: "Reclamos pendientes", value: data?.pending_claims, icon: ClipboardList, cls: "bg-secondary text-secondary-foreground" },
    { label: "Entregados este mes", value: data?.delivered_month, icon: PackageCheck, cls: "bg-card text-primary" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className={`rounded-3xl p-5 shadow-soft ${cls}`}>
            <Icon className="h-6 w-6 opacity-80" />
            <p className="mt-3 text-4xl font-extrabold">{value ?? "–"}</p>
            <p className="text-sm font-medium opacity-80">{label}</p>
          </div>
        ))}
      </div>
      {!!data?.to_receive && (
        <p className="rounded-2xl bg-status-info p-4 text-sm font-semibold text-status-info-foreground">
          Hay {data.to_receive} objeto(s) por recibir en la oficina.
        </p>
      )}
    </div>
  );
}

/* ---------- Recepción ---------- */
export function Reception() {
  const { data, isLoading } = useAdminItems();
  const refresh = useRefresh();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = data?.items.filter((i) => i.status === "por_recibir") ?? [];

  const confirm = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("found_items").update({ status: "disponible" }).eq("id", id);
    setBusy(null);
    if (error) return void toast.error("No se pudo confirmar");
    toast.success("Recepción confirmada");
    refresh();
  };

  if (isLoading) return <Loading />;
  if (!pending.length) return <Empty text="No hay objetos por recibir." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pending.map((i) => (
        <div key={i.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
          <img src={data?.photos[i.photo_path]} alt={i.name} className="h-24 w-24 shrink-0 rounded-xl bg-muted object-cover" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate font-bold text-primary">{i.name}</p>
            <p className="truncate text-xs text-muted-foreground">{i.category} · {i.location} · {formatDate(i.found_date)}</p>
            <p className="truncate text-xs text-muted-foreground">Lo trajo: {i.finder_name || i.finder_email}</p>
            <Button size="sm" variant="secondary" disabled={busy === i.id} onClick={() => confirm(i.id)} className="mt-auto rounded-lg font-semibold">
              {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Confirmar recepción
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Inventario ---------- */
export function Inventory() {
  const { data, isLoading } = useAdminItems();
  const refresh = useRefresh();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (i) =>
        (!status || i.status === status) &&
        (!t || [i.name, i.category, i.location, i.office_location ?? ""].some((v) => v.toLowerCase().includes(t))),
    );
  }, [data, q, status]);

  const changeStatus = async (id: string, s: ItemStatus) => {
    const { error } = await supabase.from("found_items").update({ status: s }).eq("id", id);
    if (error) return void toast.error("No se pudo cambiar el estado");
    toast.success(`Estado: ${STATUS[s].label}`);
    refresh();
  };

  const saveLocation = async (id: string) => {
    const value = (drafts[id] ?? "").trim().slice(0, 60);
    const { error } = await supabase.from("found_items").update({ office_location: value || null }).eq("id", id);
    if (error) return void toast.error("No se pudo guardar la ubicación");
    toast.success("Ubicación guardada");
    setDrafts(({ [id]: _, ...rest }) => rest);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar objeto o caja" className="h-10 rounded-xl bg-card pl-9" />
        </div>
        <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {isLoading ? <Loading /> : !items.length ? <Empty text="No hay objetos con esos datos." /> : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-soft">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Objeto</th>
                <th className="p-3">Encontrado</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Ubicación en oficina</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const draft = drafts[i.id];
                return (
                  <tr key={i.id} className="border-t border-border align-middle">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={data?.photos[i.photo_path]} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-muted object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-primary">{i.name}</p>
                          <p className="text-xs text-muted-foreground">{i.category}{i.color ? ` · ${i.color}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{i.location}<br />{formatDate(i.found_date)}</td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={i.status} />
                        <select aria-label="Cambiar estado" value={i.status} onChange={(e) => changeStatus(i.id, e.target.value as ItemStatus)} className="h-8 rounded-lg border border-input bg-card px-2 text-xs">
                          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={draft ?? i.office_location ?? ""}
                          onChange={(e) => setDrafts({ ...drafts, [i.id]: e.target.value })}
                          placeholder="Ej: Caja 3"
                          maxLength={60}
                          className="h-8 w-28 rounded-lg text-xs"
                        />
                        {draft !== undefined && (
                          <Button size="sm" onClick={() => saveLocation(i.id)} className="h-8 rounded-lg px-2"><Check className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Reclamos ---------- */
const CLAIM_STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-status-warning text-status-warning-foreground" },
  aceptado: { label: "Aceptado", cls: "bg-status-success text-status-success-foreground" },
  rechazado: { label: "Rechazado", cls: "bg-status-neutral text-status-neutral-foreground" },
};

export function Claims() {
  const { data, isLoading } = useAdminClaims();
  const refresh = useRefresh();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const review = async (id: string, accept: boolean) => {
    if (!accept && !reason.trim()) return void toast.error("Escribe el motivo del rechazo");
    setBusy(id);
    const { error } = await supabase.rpc("admin_review_claim", { _claim_id: id, _accept: accept, _reason: reason });
    setBusy(null);
    if (error) return void toast.error("No se pudo guardar. Intenta de nuevo.");
    toast.success(accept ? "Reclamo aceptado. Ya puedes registrar la entrega." : "Reclamo rechazado");
    setRejecting(null);
    setReason("");
    refresh();
  };

  if (isLoading) return <Loading />;
  if (!data?.claims.length) return <Empty text="No hay reclamos todavía." />;
  return (
    <div className="space-y-4">
      {data.claims.map((c) => {
        const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS["pendiente"]!;
        return (
          <div key={c.id} className="overflow-hidden rounded-3xl bg-card shadow-soft">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <img src={data.photos[c.item_photo]} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-muted object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-primary">{c.item_name}</p>
                <p className="truncate text-xs text-muted-foreground">Reclama: {c.claimant_name || "Sin nombre"} · {c.claimant_email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="space-y-2 bg-muted p-4 text-sm">
                <p className="flex items-center gap-1.5 font-bold text-primary"><Lock className="h-4 w-4" /> Datos privados del objeto</p>
                <Row label="Descripción" value={c.item_description} />
                <Row label="Detalle privado" value={c.private_detail} />
                {c.question1 && <Row label={`P1: ${c.question1}`} value="(respuesta esperada no registrada)" muted />}
                {c.question2 && <Row label={`P2: ${c.question2}`} value="(respuesta esperada no registrada)" muted />}
              </div>
              <div className="space-y-2 p-4 text-sm">
                <p className="flex items-center gap-1.5 font-bold text-primary"><MessageSquareText className="h-4 w-4" /> Lo que escribió</p>
                {c.question1 && <Row label={c.question1} value={c.answer1} />}
                {c.question2 && <Row label={c.question2} value={c.answer2} />}
                <Row label="Detalles" value={c.details} />
                {c.reject_reason && <Row label="Motivo del rechazo" value={c.reject_reason} />}
              </div>
            </div>
            {c.status === "pendiente" && (
              <div className="space-y-2 border-t border-border p-4">
                {rejecting === c.id && (
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} placeholder="Motivo del rechazo" className="rounded-xl" />
                )}
                <div className="grid grid-cols-2 gap-2">
                  {rejecting === c.id ? (
                    <>
                      <Button variant="outline" onClick={() => { setRejecting(null); setReason(""); }} className="rounded-xl">Cancelar</Button>
                      <Button variant="destructive" disabled={busy === c.id} onClick={() => review(c.id, false)} className="rounded-xl">Confirmar rechazo</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setRejecting(c.id)} className="rounded-xl border-destructive/30 text-destructive hover:text-destructive"><X className="h-4 w-4" /> Rechazar</Button>
                      <Button disabled={busy === c.id} onClick={() => review(c.id, true)} className="rounded-xl"><Check className="h-4 w-4" /> Aceptar</Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string | null; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={muted ? "text-xs italic text-muted-foreground" : "font-medium text-foreground"}>{value || "—"}</p>
    </div>
  );
}

/* ---------- Entrega ---------- */
export function Delivery() {
  const items = useAdminItems();
  const claims = useAdminClaims();
  const refresh = useRefresh();
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [ci, setCi] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const deliverable = (items.data?.items ?? []).filter((i) => i.status === "disponible" || i.status === "en_revision");
  const accepted = (claims.data?.claims ?? []).filter((c) => c.status === "aceptado" && c.item_status !== "entregado");
  const acceptedFor = accepted.find((c) => c.item_id === selected);

  const submit = async () => {
    setError("");
    if (!selected) return setError("Elige el objeto a entregar");
    if (!name.trim()) return setError("Es necesario ingresar el nombre de quien recoge el objeto");
    if (!ci.trim()) return setError("Ingresa el CI de quien recoge el objeto");
    if (!checked) return setError("Confirma que verificaste el carnet");
    setBusy(true);
    const { error } = await supabase.rpc("admin_deliver", {
      _item_id: selected, _name: name, _ci: ci, _claim_id: acceptedFor?.id ?? null,
    } as never);
    setBusy(false);
    if (error) return setError("No se pudo registrar la entrega. Intenta de nuevo.");
    toast.success(`Entregado el ${new Date().toLocaleString("es-BO")}`);
    setSelected(""); setName(""); setCi(""); setChecked(false);
    refresh();
  };

  if (items.isLoading) return <Loading />;
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-3xl bg-card p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary"><IdCard className="h-5 w-5" /> Registrar entrega</h2>
      {accepted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Reclamos aceptados</p>
          <div className="flex flex-wrap gap-2">
            {accepted.map((c) => (
              <button key={c.id} onClick={() => { setSelected(c.item_id); setName(c.claimant_name ?? ""); }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selected === c.item_id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                {c.item_name} · {c.claimant_name || c.claimant_email}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="item">Objeto</Label>
        <select id="item" value={selected} onChange={(e) => setSelected(e.target.value)} className={`${selectCls} h-11 w-full`}>
          <option value="">Elige un objeto</option>
          {deliverable.map((i) => (
            <option key={i.id} value={i.id}>{i.name}{i.office_location ? ` (${i.office_location})` : ""}</option>
          ))}
        </select>
        {selected && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {deliverable.find((i) => i.id === selected)?.office_location || "Sin ubicación en oficina"}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rname">Nombre de quien recoge</Label>
        <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ci">CI (carnet de identidad)</Label>
        <Input id="ci" value={ci} onChange={(e) => setCi(e.target.value)} maxLength={30} inputMode="numeric" className="h-11 rounded-xl" />
      </div>
      <label className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-4 w-4 accent-primary" />
        Verifiqué su identidad con el carnet
      </label>
      <p className="text-xs text-muted-foreground">La fecha y hora se guardan automáticamente.</p>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
      <Button onClick={submit} disabled={busy} className="h-12 w-full rounded-xl text-base font-semibold">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Registrar entrega
      </Button>
    </div>
  );
}
