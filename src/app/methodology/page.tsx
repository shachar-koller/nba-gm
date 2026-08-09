import type { Metadata } from "next";
import Link from "next/link";
import { dataFreshness, getAppData } from "@/lib/data";
import { getPlayerStatsData } from "@/lib/playerStats";

export const metadata: Metadata = {
  title: "Sources & Methodology",
  description:
    "How NBA Front Office sources, refreshes, validates, and calculates its contract, payroll, draft, free-agent, and player-stat data.",
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const sectionClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5";

export default function MethodologyPage() {
  const appData = getAppData();
  const appFreshness = dataFreshness(appData);
  const statsData = getPlayerStatsData();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-[12px] font-medium text-[var(--accent)]">
          Independent reference
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem]">
          Sources &amp; methodology
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--muted)]">
          NBA Front Office publishes reviewed snapshots, not a live transaction
          feed. This page explains where the numbers come from, how they are
          calculated, and where estimates or lag can occur.
        </p>
      </header>

      <section className={sectionClass} aria-labelledby="snapshot-heading">
        <h2 id="snapshot-heading" className="text-[15px] font-semibold">
          Current snapshots
        </h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <SnapshotCard
            label="Contracts, payroll & draft"
            value={appFreshness.label}
            hint={`${appData.contracts.length} contracts · ${appData.draftPicks.length} draft-right rows`}
          />
          <SnapshotCard
            label={`${statsData.season} player stats`}
            value={formatUpdatedAt(statsData.updatedAt)}
            hint={`${statsData.players.length} player-season rows · ${statsData.seasonType}`}
          />
        </dl>
      </section>

      <section className={sectionClass} aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-[15px] font-semibold">
          Data sources
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SourceCard
            name="Spotrac"
            href="https://www.spotrac.com/nba"
            detail="Player contracts, year-by-year salary rows, team payroll allocations, and future draft-right descriptions."
          />
          <SourceCard
            name="NBA announcements"
            href="https://www.nba.com/news"
            detail="Official salary cap, salary floor, luxury-tax, first-apron, and second-apron thresholds."
          />
          <SourceCard
            name="ESPN statistics"
            href="https://www.espn.com/nba/stats"
            detail="Public regular-season box-score totals and per-game statistics used by the basic and advanced tables."
          />
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="calculation-heading">
        <h2 id="calculation-heading" className="text-[15px] font-semibold">
          Calculation choices
        </h2>
        <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-[var(--muted)]">
          <MethodItem title="Apron status">
            Team spending is active roster salary plus dead money. Spotrac total
            allocations are shown only as secondary context because they can include
            free-agent holds and incomplete-roster charges.
          </MethodItem>
          <MethodItem title="Multi-year payroll">
            Projections sum listed salary amounts for each season. Options count when
            a dollar amount is present; free-agent holds are excluded.
          </MethodItem>
          <MethodItem title="Free agency">
            UFA/RFA timing and option flags are parsed from contract rows. Cap holds
            are estimates from source display values when available and are labeled
            as estimates in the interface.
          </MethodItem>
          <MethodItem title="Advanced statistics">
            TS%, eFG%, attempt rates, turnover rate, AST/TO, EFF, and stocks are
            derived from season box-score totals. They are not pace-, role-, or
            opponent-adjusted. See the{" "}
            <Link
              href="/stats/advanced#glossary"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              advanced-stat glossary
            </Link>{" "}
            for formulas and interpretation.
          </MethodItem>
        </ul>
      </section>

      <section className={sectionClass} aria-labelledby="refresh-heading">
        <h2 id="refresh-heading" className="text-[15px] font-semibold">
          Refresh, validation &amp; review
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--muted)]">
          <li>A scheduled job retrieves new source snapshots with rate limiting.</li>
          <li>
            Automated checks reject missing teams, implausibly small datasets,
            invalid timestamps, type errors, test failures, and production-build
            failures.
          </li>
          <li>
            Valid changes are proposed in a reviewable pull request before they
            become the published snapshot.
          </li>
        </ol>
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          A site-wide warning appears when the contracts/payroll snapshot is more
          than seven days old. Even a recent snapshot can briefly trail trades,
          signings, waivers, or source corrections.
        </p>
      </section>

      <section className={sectionClass} aria-labelledby="limitations-heading">
        <h2 id="limitations-heading" className="text-[15px] font-semibold">
          Limitations
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
          This is an independent reference and is not affiliated with the NBA,
          Spotrac, or ESPN. Contract language, exceptions, protections, and CBA
          treatment can be more nuanced than a summary row. Verify time-sensitive
          decisions against official league, team, and contract documentation.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/cap"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)] hover:text-[var(--accent)]"
          >
            Salary-cap reference →
          </Link>
          <Link
            href="/"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)] hover:text-[var(--accent)]"
          >
            League overview →
          </Link>
        </div>
      </section>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 text-[14px] font-semibold tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</dd>
    </div>
  );
}

function SourceCard({
  name,
  href,
  detail,
}: {
  name: string;
  href: string;
  detail: string;
}) {
  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <h3 className="text-[13px] font-semibold">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="hover:text-[var(--accent)] hover:underline"
        >
          {name} ↗
        </a>
      </h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
        {detail}
      </p>
    </article>
  );
}

function MethodItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="font-semibold text-[var(--foreground)]">{title}:</span>{" "}
      {children}
    </li>
  );
}
