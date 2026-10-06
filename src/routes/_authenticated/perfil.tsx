import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Save, KeyRound, UserRound, ClipboardList, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — UCBFound" },
      { name: "description", content: "Revisa y edita tus datos en UCBFound." },
      { property: "og:title", content: "Mi perfil — UCBFound" },
      { property: "og:description", content: "Revisa y edita tus datos en UCBFound." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user, fullName, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(fullName);
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => setName(fullName), [fullName]);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) return void toast.error("Escribe tu nombre");
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: name.trim().slice(0, 100) });
    setSavingName(false);
    if (error) return void toast.error("No se pudo guardar. Intenta de nuevo.");
    await refreshProfile();
    toast.success("Nombre actualizado");
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw) return void toast.error("Completa ambas contraseñas");
    if (newPw.length < 8) return void toast.error("La nueva contraseña debe tener al menos 8 caracteres");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({
      password: newPw,
      current_password: currentPw,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setSavingPw(false);
    if (error) return void toast.error("No se pudo cambiar. Revisa tu contraseña actual.");
    setCurrentPw("");
    setNewPw("");
    toast.success("Contraseña cambiada");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-4 rounded-3xl bg-hero p-6 shadow-lift">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <UserRound className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-primary-foreground">{fullName || "Sin nombre"}</p>
          <p className="truncate text-sm text-primary-foreground/70">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
            {role === "encargado" ? "Encargado UCB" : "Comunidad UCB"}
          </span>
        </div>
      </div>

      <Link to="/mis-reportes" className="flex items-center gap-3 rounded-3xl bg-card p-5 font-bold text-primary shadow-soft transition hover:shadow-lift">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent"><ClipboardList className="h-5 w-5" /></span>
        <span className="flex-1">Mis reportes</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <form onSubmit={saveName} className="space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="text-lg font-bold text-primary">Tu nombre</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre completo</Label>
          <Input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <Button type="submit" disabled={savingName} className="h-11 w-full rounded-xl">
          <Save className="h-4 w-4" /> Guardar
        </Button>
      </form>

      <form onSubmit={savePassword} className="space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="text-lg font-bold text-primary">Cambiar contraseña</h2>
        <div className="space-y-1.5">
          <Label htmlFor="cur">Contraseña actual</Label>
          <Input id="cur" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new">Nueva contraseña</Label>
          <Input id="new" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mínimo 8 caracteres" className="h-11 rounded-xl" />
        </div>
        <Button type="submit" variant="secondary" disabled={savingPw} className="h-11 w-full rounded-xl font-semibold">
          <KeyRound className="h-4 w-4" /> Cambiar contraseña
        </Button>
      </form>

      <Button variant="outline" onClick={signOut} className="h-12 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </Button>
    </div>
  );
}
