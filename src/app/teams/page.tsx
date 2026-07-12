import { TeamsClient } from "@/components/TeamsClient";
import {
  getAppData,
  getContracts,
  getDraftPicks,
  getTeamPayrolls,
} from "@/lib/data";
import { getCurrentCap } from "@/lib/cap";
import {
  countOwnedPicks,
  weightedAgeByTeam,
} from "@/lib/teamsMetrics";

export const metadata = {
  title: "Teams | NBA Front Office",
};

export default function TeamsPage() {
  const data = getAppData();
  const cap = getCurrentCap(data.capThresholds);
  const contracts = getContracts(data);
  const picks = getDraftPicks(data);

  const pickCounts = countOwnedPicks(picks);
  const firstRoundCounts = countOwnedPicks(picks, 1);
  const weightedAges = weightedAgeByTeam(contracts);
  const rosterCounts: Record<string, number> = {};
  for (const c of contracts) {
    rosterCounts[c.team] = (rosterCounts[c.team] ?? 0) + 1;
  }

  return (
    <TeamsClient
      payrolls={getTeamPayrolls(data)}
      cap={cap}
      pickCounts={pickCounts}
      firstRoundCounts={firstRoundCounts}
      weightedAges={weightedAges}
      rosterCounts={rosterCounts}
    />
  );
}
