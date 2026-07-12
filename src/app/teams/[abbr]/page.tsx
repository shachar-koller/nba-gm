import { notFound } from "next/navigation";
import { TeamDashboard } from "@/components/TeamsClient";
import {
  getAppData,
  getTeamContracts,
  getTeamDraftPicks,
  getTeamPayroll,
} from "@/lib/data";
import { getCurrentCap } from "@/lib/cap";
import { TEAM_BY_ABBR } from "@/lib/teams";
import type { TeamAbbr } from "@/lib/types";

export function generateStaticParams() {
  return Object.keys(TEAM_BY_ABBR).map((abbr) => ({
    abbr: abbr.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const team = TEAM_BY_ABBR[abbr.toUpperCase() as TeamAbbr];
  return {
    title: team ? `${team.fullName} | NBA Front Office` : "Team | NBA Front Office",
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr: raw } = await params;
  const abbr = raw.toUpperCase() as TeamAbbr;
  if (!TEAM_BY_ABBR[abbr]) notFound();

  const data = getAppData();
  const cap = getCurrentCap(data.capThresholds);

  return (
    <TeamDashboard
      abbr={abbr}
      payroll={getTeamPayroll(abbr, data)}
      cap={cap}
      contracts={getTeamContracts(abbr, data)}
      picks={getTeamDraftPicks(abbr, data)}
      currentSeason={data.currentSeason}
    />
  );
}
