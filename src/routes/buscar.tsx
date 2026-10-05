import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X, PackageSearch } from "lucide-react";
import { CATEGORIES, COLORS, LOCATIONS, todayISO } from "@/lib/items";
import { useAvailableItems, type ItemFilters } from "@/lib/useItems";
import { ItemCard, ItemGridSkeleton } from "@/components/items/ItemCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar objetos — UCBFound" },
      { name: "description", content: "Busca objetos perdidos y encontrados en la UCB." },
      { property: "og:title", content: "Buscar objetos — UCBFound" },
      { property: "og:description", content: "Busca objetos perdidos y encontrados en la UCB." },
    ],
  }),
  component: Buscar,
});

const selectCls = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Buscar() {
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<ItemFilters>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: text })), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isLoading, isError } = useAvailableItems(filters);
  const set = (k: keyof ItemFilters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value || undefined }));
  const activeCount = ["category", "color", "location", "from"].filter((k) => filters[k as keyof ItemFilters]).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-primary">Buscar objetos</h1>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué estás buscando?" className="h-12 rounded-xl bg-card pl-10" />
        </div>
        <Button variant={open || activeCount ? "secondary" : "outline"} onClick={() => setOpen(!open)} className="h-12 shrink-0 rounded-xl">
          <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Filtros</span>{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-card p-4 shadow-soft md:grid-cols-4">
          <select aria-label="Tipo" value={filters.category ?? ""} onChange={set("category")} className={selectCls}>
            <option value="">Todos los tipos</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Color" value={filters.color ?? ""} onChange={set("color")} className={selectCls}>
            <option value="">Todos los colores</option>
            {COLORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Lugar" value={filters.location ?? ""} onChange={set("location")} className={selectCls}>
            <option value="">Todos los lugares</option>
            {LOCATIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex flex-col text-xs font-medium text-muted-foreground">
            Desde
            <input type="date" max={todayISO()} value={filters.from ?? ""} onChange={set("from")} className={selectCls} />
          </label>
          {activeCount > 0 && (
            <button onClick={() => setFilters({ q: filters.q })} className="col-span-2 flex items-center justify-center gap-1 text-sm font-semibold text-primary md:col-span-4">
              <X className="h-4 w-4" /> Quitar filtros
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <ItemGridSkeleton count={8} />
      ) : isError ? (
        <p className="text-center text-muted-foreground">No pudimos cargar los objetos. Intenta de nuevo.</p>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((it) => <ItemCard key={it.id} item={it} photoUrl={data.photos[it.photo_path]} />)}
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
          <PackageSearch className="mx-auto h-12 w-12 text-secondary" />
          <p className="mt-3 font-semibold text-primary">No encontramos objetos con esos datos. ¿Quieres reportarlo como perdido?</p>
          <Button asChild className="mt-5 h-11 rounded-xl">
            <Link to="/reportar" search={{ tipo: "perdido" }}>Reportar como perdido</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
