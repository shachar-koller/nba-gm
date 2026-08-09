import type { MetadataRoute } from "next";
import { getAppData } from "@/lib/data";
import { getPlayerStats } from "@/lib/playerStats";
import {
  createPlayerProfileIndex,
  playerProfileHref,
} from "@/lib/playerProfiles";
import { TEAMS } from "@/lib/teams";
import { siteOrigin } from "@/lib/siteUrl";
import { PLAYER_PROFILE_REGISTRY } from "@/lib/playerProfileRegistry";

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
  "/methodology",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const appData = getAppData();
  const playerProfiles = createPlayerProfileIndex(
    appData.contracts,
    getPlayerStats(),
    PLAYER_PROFILE_REGISTRY
  ).profiles;

  const pages: MetadataRoute.Sitemap = ROUTES.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const teams: MetadataRoute.Sitemap = TEAMS.map((t) => ({
    url: `${base}/teams/${t.abbr.toLowerCase()}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const players: MetadataRoute.Sitemap = playerProfiles.map((profile) => {
    const path = playerProfileHref(profile.id);
    return {
      url: `${base}${path}`,
      changeFrequency: "weekly",
      priority: 0.5,
    };
  });

  return [...pages, ...teams, ...players];
}
