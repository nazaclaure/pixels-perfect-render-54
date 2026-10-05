import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, Home, PlusCircle, Search, User, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/reportar", label: "Reportar", icon: PlusCircle },
  { to: "/avisos", label: "Avisos", icon: Bell },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-xl font-extrabold tracking-tight ${light ? "text-primary-foreground" : "text-primary"}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <Search className="h-5 w-5" strokeWidth={2.75} />
      </span>
      <span>UCB<span className="text-secondary">Found</span></span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-30 bg-primary shadow-soft">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/"><Logo light /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
                activeProps={{ className: "bg-primary-foreground/10 !text-secondary" }}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          {user ? (
            role === "encargado" && (
              <Link to="/encargado" className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
                <LayoutDashboard className="h-4 w-4" /> Panel
              </Link>
            )
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground"
            >
              <LogIn className="h-4 w-4" /> Ingresar
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive ? "bg-secondary text-secondary-foreground" : ""}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ComingSoon({ title, icon: Icon }: { title: string; icon: typeof Home }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl bg-card p-10 text-center shadow-soft">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-primary">
        <Icon className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-muted-foreground">Próximamente</p>
    </div>
  );
}
