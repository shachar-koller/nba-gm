import { SalariesClient } from "@/components/SalariesClient";
import { getAppData, getContracts, uniquePositions } from "@/lib/data";
import { getCurrentCap } from "@/lib/cap";

export const metadata = {
  title: "Player Salaries | NBA Front Office",
};

export default function SalariesPage() {
  const data = getAppData();
  const contracts = getContracts(data);
  return (
    <SalariesClient
      contracts={contracts}
      season={data.currentSeason}
      cap={getCurrentCap(data.capThresholds)}
      positions={uniquePositions(contracts)}
    />
  );
}
