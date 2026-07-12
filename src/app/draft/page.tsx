import { DraftPicksClient } from "@/components/DraftPicksClient";
import { getDraftPicks } from "@/lib/data";

export const metadata = {
  title: "Draft Picks | NBA Front Office",
};

export default function DraftPage() {
  const picks = getDraftPicks();
  return <DraftPicksClient picks={picks} />;
}
