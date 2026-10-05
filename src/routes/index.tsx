import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearch, HandHeart, ArrowRight } from "lucide-react";
import { useAvailableItems } from "@/lib/useItems";
import { ItemCard, ItemGridSkeleton } from "@/components/items/ItemCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UCBFound — ¿Perdiste algo en la U?" },
      { name: "description", content: "Reporta o encuentra objetos perdidos en la Universidad Católica Boliviana." },
      { property: "og:title", content: "UCBFound — ¿Perdiste algo en la U?" },
      { property: "og:description", content: "Reporta o encuentra objetos perdidos en la Universidad Católica Boliviana." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="bg-hero relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-lift sm:py-16">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/20" />
        <div className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-secondary/10" />
        <span className="relative inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
          Comunidad UCB
        </span>
        <h1 className="relative mt-4 text-3xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">
          ¿Perdiste algo en la U?
          <br />
          <span className="text-secondary">Encuéntralo aquí.</span>
        </h1>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/reportar"
          search={{ tipo: "perdido" }}
          className="group flex items-center gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10 text-secondary">
            <PackageSearch className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold">Perdí algo</span>
            <span className="block text-sm text-primary-foreground/70">Avisa qué perdiste</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
        </Link>
        <Link
          to="/reportar"
          search={{ tipo: "encontrado" }}
          className="group flex items-center gap-4 rounded-3xl bg-secondary p-6 text-secondary-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-secondary">
            <HandHeart className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold">Encontré algo</span>
            <span className="block text-sm text-secondary-foreground/75">Ayuda a devolverlo</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <LatestFound />
    </div>
  );
}

function LatestFound() {
  const { data, isLoading } = useAvailableItems({}, 8);
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl font-extrabold text-primary">Últimos objetos encontrados</h2>
        <Link to="/buscar" className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">Ver todos</Link>
      </div>
      {isLoading ? (
        <ItemGridSkeleton />
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((it) => <ItemCard key={it.id} item={it} photoUrl={data.photos[it.photo_path]} />)}
        </div>
      ) : (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">Todavía no hay objetos disponibles.</p>
      )}
    </section>
  );
}
