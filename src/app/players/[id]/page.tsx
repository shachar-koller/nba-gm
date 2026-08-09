import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { OptionBadge } from "@/components/Badge";
import { TeamChip, TeamLogo } from "@/components/TeamLogo";
import { getAppData } from "@/lib/data";
import {
  effectiveFreeAgencyType,
  effectiveFreeAgencyYear,
  faCapHold,
} from "@/lib/freeAgency";
import { formatMoney, formatNum, formatPct } from "@/lib/format";
import {
  createPlayerProfileIndex,
  playerProfileHref,
  type PlayerProfile,
} from "@/lib/playerProfiles";
import {
  formatRate,
  getPlayerStats,
  getPlayerStatsData,
} from "@/lib/playerStats";
import { TEAM_BY_ABBR } from "@/lib/teams";
import { PLAYER_PROFILE_REGISTRY } from "@/lib/playerProfileRegistry";

const appData = getAppData();
const statsData = getPlayerStatsData();
const profileIndex = createPlayerProfileIndex(
  appData.contracts,
  getPlayerStats(statsData),
  PLAYER_PROFILE_REGISTRY
);

/** Only canonical and source-alias IDs from the bundled snapshots are routes. */
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from(profileIndex.byRouteId.keys(), (id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = profileIndex.byRouteId.get(id);
  if (!profile) return { title: "Player" };

  const description = playerDescription(profile);
  return {
    title: profile.name,
    description,
    alternates: { canonical: playerProfileHref(profile.id) },
    openGraph: {
      title: `${profile.name} | NBA Front Office`,
      description,
      type: "profile",
    },
  };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = profileIndex.byRouteId.get(id);
  if (!profile) notFound();
  if (id !== profile.id) permanentRedirect(playerProfileHref(profile.id));

  const { contract, stats } = profile;
  const team = profile.team ? TEAM_BY_ABBR[profile.team] : null;
  const statsTeamDiffers = Boolean(
    contract?.team && stats?.team && contract.team !== stats.team
  );

  return (
    <article className="space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)] print:hidden"
      >
        <Link href="/salaries" className="hover:text-[var(--accent)]">
          Players
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="text-[var(--foreground)]">
          {profile.name}
        </span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-[var(--border-strong)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {profile.team ? (
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)]"
              style={{ backgroundColor: `${team?.primary ?? "#64748b"}16` }}
            >
              <TeamLogo abbr={profile.team} size={44} />
            </span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-lg font-semibold text-[var(--muted)]">
              {initials(profile.name)}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem]">
                {profile.name}
              </h1>
              <SourceBadge hasContract={Boolean(contract)} hasStats={Boolean(stats)} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--muted)]">
              {profile.team && <TeamChip abbr={profile.team} showName />}
              <span>
                {profile.position || "Position unavailable"}
                {profile.age != null ? ` · Age ${profile.age}` : ""}
              </span>
              {statsTeamDiffers && (
                <span className="text-[11px] text-[var(--faint)]">
                  {statsData.season} stats with {stats!.team}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {profile.team && (
            <Link
              href={`/teams/${profile.team.toLowerCase()}`}
              className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            >
              Team dashboard
            </Link>
          )}
          <Link
            href={`/salaries?q=${encodeURIComponent(profile.name)}`}
            className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            Salary search
          </Link>
          <Link
            href={`/stats?q=${encodeURIComponent(profile.name)}`}
            className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            Stats search
          </Link>
        </div>
      </header>

      {contract ? (
        <ContractSection profile={profile} currentSeason={appData.currentSeason} />
      ) : (
        <MissingSection
          title="Contract snapshot"
          body="No current Spotrac contract row matched this ESPN player. The profile remains available so stats links stay stable."
          href={`/salaries?q=${encodeURIComponent(profile.name)}`}
          action="Search salary records"
        />
      )}

      {stats ? (
        <StatsSection profile={profile} season={statsData.season} />
      ) : (
        <MissingSection
          title={`${statsData.season} regular-season stats`}
          body="No ESPN stats row matched this contract record. This can include rookies, inactive players, and players without a qualifying appearance in the snapshot."
          href={`/stats?q=${encodeURIComponent(profile.name)}`}
          action="Search stats"
        />
      )}
    </article>
  );
}

function ContractSection({
  profile,
  currentSeason,
}: {
  profile: PlayerProfile;
  currentSeason: string;
}) {
  const contract = profile.contract!;
  const faYear = effectiveFreeAgencyYear(contract);
  const faType = effectiveFreeAgencyType(contract);
  const hold = faCapHold(contract);

  return (
    <section aria-labelledby="contract-heading" className="space-y-3">
      <SectionHeading
        id="contract-heading"
        title="Contract"
        detail={`${currentSeason} front-office snapshot · Spotrac`}
      />

      <dl className="grid grid-cols-2 border-y border-[var(--border-strong)] bg-[var(--surface)] sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Current salary" value={formatMoney(contract.currentSalary)} />
        <Metric label="Guaranteed*" value={formatMoney(contract.guaranteed, true)} />
        <Metric label="Contract years" value={contract.contractYears || "—"} />
        <Metric
          label="Free agency"
          value={
            faYear ? (
              <span className="inline-flex items-center gap-1.5">
                {faYear}
                {faType && <OptionBadge option={faType === "UFA" ? "ufa" : "rfa"} />}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Metric
          label="Cap hold (est.)"
          value={hold.amount != null ? formatMoney(hold.amount, true) : "—"}
        />
      </dl>

      {contract.notes.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {contract.notes.map((note) => (
            <li
              key={note}
              className="rounded-[var(--radius-sm)] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-2 text-[12px] text-[var(--warn)]"
            >
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--table-head)]">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2 text-right">Salary</th>
              <th className="px-3 py-2 text-right">% cap</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {contract.salaries.length > 0 ? (
              contract.salaries.map((salary) => (
                <tr
                  key={`${salary.season}-${salary.option}`}
                  className={`border-t border-[var(--border)] ${salary.season === currentSeason ? "bg-[var(--accent-soft)]/40" : ""}`}
                >
                  <td className="px-3 py-2 font-medium tabular-nums">
                    {salary.season}
                    {salary.season === currentSeason && (
                      <span className="ml-1.5 text-[10px] font-normal text-[var(--accent)]">
                        now
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {salary.amount != null
                      ? formatMoney(salary.amount)
                      : salary.display || "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">
                    {salary.pctOfCap != null ? formatPct(salary.pctOfCap) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <OptionBadge option={salary.option} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-[var(--muted)]">
                  No salary rows listed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        * Guaranteed amount is estimated from remaining listed years. Cap hold is parsed from the source row when available.
      </p>
    </section>
  );
}

function StatsSection({
  profile,
  season,
}: {
  profile: PlayerProfile;
  season: string;
}) {
  const stats = profile.stats!;

  return (
    <section aria-labelledby="stats-heading" className="space-y-3">
      <SectionHeading
        id="stats-heading"
        title="Regular-season stats"
        detail={`${season} per-game averages · ESPN`}
      />

      <dl className="grid grid-cols-2 border-y border-[var(--border-strong)] bg-[var(--surface)] sm:grid-cols-4 lg:grid-cols-8">
        <Metric label="GP" value={stats.gp || "—"} />
        <Metric label="MIN" value={formatNum(stats.min)} />
        <Metric label="PTS" value={formatNum(stats.pts)} />
        <Metric label="REB" value={formatNum(stats.reb)} />
        <Metric label="AST" value={formatNum(stats.ast)} />
        <Metric label="STL" value={formatNum(stats.stl)} />
        <Metric label="BLK" value={formatNum(stats.blk)} />
        <Metric label="TOV" value={formatNum(stats.tov)} />
      </dl>

      <div className="grid gap-3 lg:grid-cols-2">
        <StatPanel
          title="Shooting"
          rows={[
            ["FG", `${formatNum(stats.fgm)} / ${formatNum(stats.fga)}`, formatPct(stats.fgPct)],
            ["3PT", `${formatNum(stats.threePm)} / ${formatNum(stats.threePa)}`, formatPct(stats.threePct)],
            ["FT", `${formatNum(stats.ftm)} / ${formatNum(stats.fta)}`, formatPct(stats.ftPct)],
            ["True shooting", "TS%", formatPct(stats.tsPct)],
            ["Effective FG", "eFG%", formatPct(stats.efgPct)],
          ]}
        />
        <StatPanel
          title="Rates and impact"
          rows={[
            ["Three-point rate", "3PAr", formatRate(stats.threePar)],
            ["Free-throw rate", "FTr", formatRate(stats.ftr)],
            ["Assist / turnover", "AST/TO", formatNum(stats.astTo, 2)],
            ["Turnover rate", "TOV%", formatPct(stats.tovPct)],
            ["Traditional efficiency", "EFF", formatNum(stats.eff)],
            ["Steals + blocks", "Stocks", formatNum(stats.stocks)],
          ]}
        />
      </div>
    </section>
  );
}

function StatPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
      <h3 className="border-b border-[var(--border)] px-3.5 py-2.5 text-[13px] font-semibold">
        {title}
      </h3>
      <dl className="divide-y divide-[var(--border)]">
        {rows.map(([label, short, value]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3.5 py-2">
            <dt className="text-[12px] text-[var(--muted)]">{label}</dt>
            <dd className="text-[11px] text-[var(--faint)] tabular-nums">{short}</dd>
            <dd className="min-w-12 text-right text-[13px] font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  detail,
}: {
  id: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-[16px] font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-[11px] text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l border-[var(--border)] px-3 py-3 first:border-l-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[17px] font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function MissingSection({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-1 max-w-3xl text-[13px] text-[var(--muted)]">{body}</p>
      <Link href={href} className="mt-2 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline">
        {action} →
      </Link>
    </section>
  );
}

function SourceBadge({
  hasContract,
  hasStats,
}: {
  hasContract: boolean;
  hasStats: boolean;
}) {
  const label = hasContract && hasStats ? "Contract + stats" : hasContract ? "Contract" : "Stats";
  return (
    <span className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
      {label}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function playerDescription(profile: PlayerProfile): string {
  const parts = [
    profile.team ? `${profile.team} ${profile.position || "player"}` : profile.position || "NBA player",
    profile.contract ? "contract and salary details" : null,
    profile.stats ? `${statsData.season} regular-season stats` : null,
  ].filter(Boolean);
  return `${profile.name}: ${parts.join(", ")}.`;
}
