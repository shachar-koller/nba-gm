import { espnLogo, TEAM_BY_ABBR } from "@/lib/teams";
import type { TeamAbbr } from "@/lib/types";
import { classNames } from "@/lib/format";

export function TeamLogo({
  abbr,
  size = 24,
  className,
}: {
  abbr: TeamAbbr;
  size?: number;
  className?: string;
}) {
  const team = TEAM_BY_ABBR[abbr];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={espnLogo(abbr)}
      alt={team?.fullName ?? abbr}
      width={size}
      height={size}
      className={classNames("inline-block object-contain", className)}
      loading="lazy"
    />
  );
}

export function TeamChip({
  abbr,
  showName = false,
  size = 20,
}: {
  abbr: TeamAbbr;
  showName?: boolean;
  size?: number;
}) {
  const team = TEAM_BY_ABBR[abbr];
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${team.primary}22` }}
      >
        <TeamLogo abbr={abbr} size={size} />
      </span>
      <span className="font-semibold tabular-nums">{abbr}</span>
      {showName && (
        <span className="truncate text-[var(--muted)] text-sm hidden sm:inline">
          {team.name}
        </span>
      )}
    </span>
  );
}
