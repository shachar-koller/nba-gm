import { AdvancedStatsClient } from "@/components/AdvancedStatsClient";
import {
  getPlayerStats,
  getPlayerStatsData,
  uniqueStatPositions,
} from "@/lib/playerStats";

export const metadata = {
  title: "Advanced Stats | NBA Front Office",
  description:
    "Advanced NBA player metrics — TS%, eFG%, turnover rate, EFF, and more — with explanations for how to use each stat.",
};

export default function AdvancedStatsPage() {
  const data = getPlayerStatsData();
  const players = getPlayerStats(data);
  return (
    <AdvancedStatsClient
      players={players}
      season={data.season}
      positions={uniqueStatPositions(players)}
    />
  );
}
