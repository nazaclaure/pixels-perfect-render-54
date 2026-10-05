import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { Camera, CheckCircle2, Loader2, MapPin, Clock, PackageSearch, HandHeart, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, COLORS, LOCATIONS, OFFICE, todayISO, uploadPhoto } from "@/lib/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/reportar")({
  validateSearch: z.object({ tipo: z.enum(["perdido", "encontrado"]).optional() }),
  head: () => ({
    meta: [
      { title: "Reportar un objeto — UCBFound" },
      { name: "description", content: "Reporta un objeto que perdiste o encontraste en la UCB." },
      { property: "og:title", content: "Reportar un objeto — UCBFound" },
      { property: "og:description", content: "Reporta un objeto que perdiste o encontraste en la UCB." },
    ],
  }),
  component: Reportar,
});

const selectCls = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, children, htmlFor }: { label: string; required?: boolean; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}

function Reportar() {
  const { tipo = "perdido" } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1.5 shadow-soft">
        {([["perdido", "Perdí algo", PackageSearch], ["encontrado", "Encontré algo", HandHeart]] as const).map(([k, l, Icon]) => (
          <button
            key={k}
            onClick={() => navigate({ to: "/reportar", search: { tipo: k }, replace: true })}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${tipo === k ? (k === "perdido" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground") : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>
      <ReportForm key={tipo} kind={tipo} />
    </div>
  );
}

function ReportForm({ kind }: { kind: "perdido" | "encontrado" }) {
  const { user } = useAuth();
  const found = kind === "encontrado";
  const [f, setF] = useState({ name: "", category: "", description: "", color: "", location: "", date: todayISO(), privateDetail: "", q1: "", q2: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Solo puedes subir imágenes"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("La foto es muy pesada (máximo 10 MB)"); return; }
    setError("");
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return;
    if (!f.name.trim() || !f.category || !f.location || !f.date) return setError("Completa los campos obligatorios");
    if (f.date > todayISO()) return setError("La fecha no puede ser futura");
    if (found && !file) return setError("La foto es obligatoria");
    setBusy(true);
    try {
      const photo_path = file ? await uploadPhoto(user.id, file) : null;
      const base = {
        name: f.name.trim().slice(0, 100),
        category: f.category,
        description: f.description.trim().slice(0, 1000) || null,
        color: f.color || null,
        location: f.location,
      };
      if (found) {
        const id = crypto.randomUUID();
        const { error } = await supabase.from("found_items").insert({ ...base, id, finder_id: user.id, found_date: f.date, photo_path: photo_path! });
        if (error) throw error;
        if (f.privateDetail.trim() || f.q1.trim() || f.q2.trim()) {
          const { error: e2 } = await supabase.from("found_item_secrets").insert({
            item_id: id,
            private_detail: f.privateDetail.trim().slice(0, 500) || null,
            question1: f.q1.trim().slice(0, 200) || null,
            question2: f.q2.trim().slice(0, 200) || null,
          });
          if (e2) throw e2;
        }
      } else {
        const { error } = await supabase.from("lost_reports").insert({ ...base, user_id: user.id, lost_date: f.date, photo_path });
        if (error) throw error;
      }
      setDone(true);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto h-14 w-14 text-status-success-foreground" />
        {found ? (
          <>
            <h2 className="mt-4 text-xl font-bold text-primary">¡Gracias por ayudar!</h2>
            <p className="mt-2 text-muted-foreground">Lleva el objeto a:</p>
            <div className="mt-4 space-y-2 rounded-2xl bg-accent p-4 text-left">
              <p className="flex items-center gap-2 font-bold text-primary"><MapPin className="h-5 w-5 shrink-0 text-secondary-foreground" />{OFFICE.name}</p>
              <p className="flex items-center gap-2 text-sm text-accent-foreground"><Clock className="h-5 w-5 shrink-0" />{OFFICE.hours}</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Aparecerá en la búsqueda cuando el encargado lo reciba.</p>
          </>
        ) : (
          <p className="mt-4 text-lg font-semibold text-primary">Tu reporte fue registrado. Te avisaremos si alguien encuentra algo parecido.</p>
        )}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-11 rounded-xl"><Link to="/">Ir al inicio</Link></Button>
          <Button asChild className="h-11 rounded-xl"><Link to="/buscar">Ver objetos encontrados</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl bg-card p-5 shadow-soft sm:p-6">
      <h1 className="text-xl font-extrabold text-primary">{found ? "Registrar objeto encontrado" : "Reportar objeto perdido"}</h1>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-input bg-muted p-4 text-center text-sm text-muted-foreground transition hover:border-secondary">
        {preview ? (
          <img src={preview} alt="Vista previa" className="max-h-56 rounded-xl object-contain" />
        ) : (
          <>
            <Camera className="h-8 w-8 text-secondary" />
            <span className="font-semibold text-primary">{found ? "Sube una foto *" : "Sube una foto (opcional)"}</span>
          </>
        )}
        {preview && <span className="text-xs">Toca para cambiar</span>}
        <input type="file" accept="image/*" onChange={pickFile} className="sr-only" />
      </label>

      <Field label="Nombre del objeto" required htmlFor="name">
        <Input id="name" value={f.name} onChange={set("name")} maxLength={100} placeholder="Ej: Celular Samsung" className="h-11 rounded-xl" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" required htmlFor="cat">
          <select id="cat" value={f.category} onChange={set("category")} className={selectCls}>
            <option value="">Elige</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Color" htmlFor="color">
          <select id="color" value={f.color} onChange={set("color")} className={selectCls}>
            <option value="">Elige</option>
            {COLORS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={found ? "Dónde lo encontraste" : "Dónde lo perdiste"} required htmlFor="loc">
          <select id="loc" value={f.location} onChange={set("location")} className={selectCls}>
            <option value="">Elige</option>
            {LOCATIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Fecha" required htmlFor="date">
          <input id="date" type="date" max={todayISO()} value={f.date} onChange={set("date")} className={selectCls} />
        </Field>
      </div>
      <Field label="Descripción" htmlFor="desc">
        <Textarea id="desc" value={f.description} onChange={set("description")} maxLength={1000} rows={3} placeholder="Marca, modelo, detalles..." className="rounded-xl" />
      </Field>

      {found && (
        <div className="space-y-3 rounded-2xl bg-muted p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-primary"><Lock className="h-4 w-4" /> Solo lo verá el encargado</p>
          <Field label="Detalle privado que solo el dueño sabría" htmlFor="priv">
            <Input id="priv" value={f.privateDetail} onChange={set("privateDetail")} maxLength={500} placeholder="Ej: tiene un sticker en la parte de atrás" className="h-11 rounded-xl bg-card" />
          </Field>
          <Field label="Pregunta de verificación 1" htmlFor="q1">
            <Input id="q1" value={f.q1} onChange={set("q1")} maxLength={200} placeholder="Ej: ¿Qué fondo de pantalla tiene?" className="h-11 rounded-xl bg-card" />
          </Field>
          <Field label="Pregunta de verificación 2" htmlFor="q2">
            <Input id="q2" value={f.q2} onChange={set("q2")} maxLength={200} className="h-11 rounded-xl bg-card" />
          </Field>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} variant={found ? "secondary" : "default"} className="h-12 w-full rounded-xl text-base font-semibold">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {found ? "Registrar objeto" : "Enviar reporte"}
      </Button>
    </form>
  );
}
