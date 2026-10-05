import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar objetos — UCBFound" },
      { name: "description", content: "Busca objetos perdidos y encontrados en la UCB." },
      { property: "og:title", content: "Buscar objetos — UCBFound" },
      { property: "og:description", content: "Busca objetos perdidos y encontrados en la UCB." },
    ],
  }),
  component: () => <ComingSoon title="Buscar" icon={Search} />,
});
