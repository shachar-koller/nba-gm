import { FreeAgentClassesClient } from "@/components/FreeAgentClassesClient";
import { getAppData, getContracts, uniquePositions } from "@/lib/data";

export const metadata = {
  title: "Free Agent Classes | NBA Front Office",
};

export default function FreeAgentsPage() {
  const data = getAppData();
  const contracts = getContracts(data);
  return (
    <FreeAgentClassesClient
      contracts={contracts}
      season={data.currentSeason}
      positions={uniquePositions(contracts)}
    />
  );
}
