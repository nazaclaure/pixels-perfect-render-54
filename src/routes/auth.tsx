import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ShieldCheck, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDemoAccount } from "@/lib/demo.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — UCBFound" },
      { name: "description", content: "Ingresa o crea tu cuenta UCBFound con tu correo institucional." },
      { property: "og:title", content: "Ingresar — UCBFound" },
      { property: "og:description", content: "Ingresa o crea tu cuenta UCBFound con tu correo institucional." },
    ],
  }),
  component: AuthPage,
});

const DOMAIN = "@ucb.edu.bo";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const demoFn = useServerFn(getDemoAccount);
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!mail || !password) return setError("Por favor, ingrese correo y contraseña");
    if (!mail.endsWith(DOMAIN)) return setError("Usa tu correo institucional de la UCB");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres");

    setBusy("form");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
      setBusy(null);
      if (error) return setError("Correo o contraseña no son válidos");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim().slice(0, 100) } },
      });
      setBusy(null);
      if (error) {
        if (/registered|already/i.test(error.message)) return setError("Este correo ya está registrado");
        return setError("No se pudo crear la cuenta. Intenta de nuevo.");
      }
      if (data.user && data.user.identities?.length === 0) return setError("Este correo ya está registrado");
      if (!data.session) setCheckEmail(true);
    }
  };

  const demo = async (role: "miembro" | "encargado") => {
    setError("");
    setBusy(role);
    try {
      const creds = await demoFn({ data: { role } });
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
    } catch {
      setError("No se pudo entrar como demo. Intenta de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  if (checkEmail) {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <MailCheck className="mx-auto h-12 w-12 text-secondary" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Revisa tu correo</h1>
        <p className="mt-2 text-muted-foreground">
          Te enviamos un enlace a <b>{email}</b> para activar tu cuenta.
        </p>
        <Button variant="outline" className="mt-6 rounded-xl" onClick={() => { setCheckEmail(false); setMode("login"); }}>
          Volver a ingresar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl bg-card p-6 shadow-soft sm:p-8">
        <h1 className="text-2xl font-extrabold text-primary">
          {mode === "login" ? "¡Hola de nuevo!" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Usa tu correo de la UCB.</p>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-muted p-1">
          {(["login", "registro"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className={`rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}
            >
              {m === "login" ? "Ingresar" : "Registrarme"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          {mode === "registro" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="h-11 rounded-xl" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo institucional</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ucb.edu.bo" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="h-11 rounded-xl" />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={!!busy} className="h-12 w-full rounded-xl text-base font-semibold">
            {busy === "form" && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </Button>
        </form>
      </div>

      <div className="mt-4 rounded-3xl border-2 border-dashed border-secondary bg-accent p-5">
        <p className="text-center text-sm font-semibold text-primary">¿Solo quieres probar? Entra como demo</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={!!busy} onClick={() => demo("miembro")} className="h-12 rounded-xl font-semibold">
            {busy === "miembro" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            Estudiante
          </Button>
          <Button disabled={!!busy} onClick={() => demo("encargado")} className="h-12 rounded-xl font-semibold">
            {busy === "encargado" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Encargado
          </Button>
        </div>
      </div>
    </div>
  );
}
