import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, CheckCircle2, XCircle, Sparkles, PackageCheck, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMarkAllRead, useNotifications, timeAgo } from "@/lib/notifications";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos — UCBFound" },
      { name: "description", content: "Tus avisos sobre objetos perdidos y encontrados." },
      { property: "og:title", content: "Avisos — UCBFound" },
      { property: "og:description", content: "Tus avisos sobre objetos perdidos y encontrados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avisos,
});

const ICONS: Record<string, { icon: typeof Bell; cls: string }> = {
  coincidencia: { icon: Sparkles, cls: "bg-accent text-primary" },
  reclamo_aceptado: { icon: CheckCircle2, cls: "bg-status-success text-status-success-foreground" },
  reclamo_rechazado: { icon: XCircle, cls: "bg-destructive/10 text-destructive" },
  listo: { icon: PackageCheck, cls: "bg-status-info text-status-info-foreground" },
};

function Avisos() {
  const { user, loading } = useAuth();
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllRead();
  const router = useRouter();
  const hasUnread = !!data?.some((n) => !n.read_at);

  useEffect(() => {
    if (!hasUnread) return;
    const t = setTimeout(() => void markAll(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  if (!loading && !user) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <Bell className="mx-auto h-10 w-10 text-secondary" />
        <h1 className="mt-4 text-xl font-bold text-primary">Tus avisos</h1>
        <p className="mt-2 text-muted-foreground">Ingresa para ver tus avisos.</p>
        <Button asChild className="mt-5 h-11 rounded-xl"><Link to="/auth"><LogIn className="h-4 w-4" /> Ingresar</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold text-primary">Avisos</h1>
      {isLoading || loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />)}</div>
      ) : !data?.length ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-soft">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Todavía no tienes avisos.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => {
            const { icon: Icon, cls } = ICONS[n.type] ?? { icon: Bell, cls: "bg-muted text-primary" };
            return (
              <li key={n.id}>
                <button
                  onClick={() => n.link && router.history.push(n.link)}
                  className={`flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-soft transition hover:shadow-lift ${!n.read_at ? "ring-2 ring-secondary" : ""}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-primary">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
