import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/reportar")({
  head: () => ({
    meta: [
      { title: "Reportar un objeto — UCBFound" },
      { name: "description", content: "Reporta un objeto que perdiste o encontraste en la UCB." },
      { property: "og:title", content: "Reportar un objeto — UCBFound" },
      { property: "og:description", content: "Reporta un objeto que perdiste o encontraste en la UCB." },
    ],
  }),
  component: () => <ComingSoon title="Reportar" icon={PlusCircle} />,
});
