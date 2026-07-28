import type { MetadataRoute } from "next";
import { TEAMS } from "@/lib/teams";

const ROUTES = [
  "/",
  "/draft",
  "/cap",
  "/salaries",
  "/free-agents",
  "/teams",
  "/staff",
  "/stats",
  "/stats/advanced",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";

  const pages: MetadataRoute.Sitemap = ROUTES.map((path) => ({
    url: base ? `${base}${path}` : path,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const teams: MetadataRoute.Sitemap = TEAMS.map((t) => ({
    url: base ? `${base}/teams/${t.abbr.toLowerCase()}` : `/teams/${t.abbr.toLowerCase()}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...pages, ...teams];
}
