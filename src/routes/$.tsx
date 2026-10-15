import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell/Shell";


export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "KHCWW — Welfare Member Portal" },
      { name: "description", content: "Member portal for contributions, beneficiaries, statements, donations and events." },
      { property: "og:title", content: "KHCWW — Welfare Member Portal" },
      { property: "og:description", content: "Member portal for contributions, beneficiaries, statements, donations and events." },
    ],
  }),
  component: Shell,
});
