import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { LayoutDashboard, PackageCheck, Boxes, ClipboardList, IdCard, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Summary, Reception, Inventory, Claims, Delivery } from "@/components/admin/AdminSections";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "recepcion", label: "Recepción", icon: PackageCheck },
  { id: "inventario", label: "Inventario", icon: Boxes },
  { id: "reclamos", label: "Reclamos", icon: ClipboardList },
  { id: "entrega", label: "Entrega", icon: IdCard },
] as const;
type Tab = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_authenticated/encargado")({
  validateSearch: z.object({ tab: z.enum(["resumen", "recepcion", "inventario", "reclamos", "entrega"]).optional() }),
  head: () => ({
    meta: [
      { title: "Panel del encargado — UCBFound" },
      { name: "description", content: "Gestiona recepción, inventario, reclamos y entregas de objetos." },
      { property: "og:title", content: "Panel del encargado — UCBFound" },
      { property: "og:description", content: "Gestiona recepción, inventario, reclamos y entregas de objetos." },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { role, loading } = useAuth();
  const { tab = "resumen" } = Route.useSearch();
  const navigate = useNavigate();

  if (loading) return <div className="h-40 animate-pulse rounded-3xl bg-card" />;
  if (role !== "encargado") {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-12 w-12 text-secondary" />
        <p className="mt-3 font-semibold text-primary">Esta sección es solo para el encargado UCB.</p>
        <Button asChild className="mt-5 rounded-xl"><Link to="/">Ir al inicio</Link></Button>
      </div>
    );
  }

  const Section: Record<Tab, () => React.JSX.Element> = {
    resumen: Summary, recepcion: Reception, inventario: Inventory, reclamos: Claims, entrega: Delivery,
  };
  const Current = Section[tab];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-primary">Panel del encargado</h1>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate({ to: "/encargado", search: { tab: id }, replace: true })}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground hover:text-primary"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      <Current />
    </div>
  );
}
