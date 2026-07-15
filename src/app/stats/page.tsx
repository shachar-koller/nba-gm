import { StatsClient } from "@/components/StatsClient";
import {
  getPlayerStats,
  getPlayerStatsData,
  uniqueStatPositions,
} from "@/lib/playerStats";

export const metadata = {
  title: "Player Stats | NBA Front Office",
  description:
    "Sortable NBA regular-season per-game stats: points, rebounds, assists, steals, blocks, shooting, and more.",
};

export default function StatsPage() {
  const data = getPlayerStatsData();
  const players = getPlayerStats(data);
  return (
    <StatsClient
      players={players}
      season={data.season}
      positions={uniqueStatPositions(players)}
    />
  );
}
