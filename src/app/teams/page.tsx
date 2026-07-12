import { TeamsClient } from "@/components/TeamsClient";
import {
  getAppData,
  getContracts,
  getDraftPicks,
  getTeamPayrolls,
} from "@/lib/data";
import { getCurrentCap } from "@/lib/cap";

export const metadata = {
  title: "Teams | NBA Front Office",
};

export default function TeamsPage() {
  const data = getAppData();
  const cap = getCurrentCap(data.capThresholds);
  const contracts = getContracts(data);
  const picks = getDraftPicks(data);

  const pickCounts: Record<string, number> = {};
  const rosterCounts: Record<string, number> = {};
  for (const p of picks) {
    pickCounts[p.currentOwner] = (pickCounts[p.currentOwner] ?? 0) + 1;
  }
  for (const c of contracts) {
    rosterCounts[c.team] = (rosterCounts[c.team] ?? 0) + 1;
  }

  return (
    <TeamsClient
      payrolls={getTeamPayrolls(data)}
      cap={cap}
      pickCounts={pickCounts}
      rosterCounts={rosterCounts}
    />
  );
}
