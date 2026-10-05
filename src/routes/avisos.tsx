import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/AppShell";

export const Route = createFileRoute("/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos — UCBFound" },
      { name: "description", content: "Tus avisos sobre objetos perdidos y encontrados." },
      { property: "og:title", content: "Avisos — UCBFound" },
      { property: "og:description", content: "Tus avisos sobre objetos perdidos y encontrados." },
    ],
  }),
  component: () => <ComingSoon title="Avisos" icon={Bell} />,
});
