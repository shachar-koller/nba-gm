import Link from "next/link";
import { getAppData, dataFreshness } from "@/lib/data";
import { formatMoney, formatDelta } from "@/lib/format";
import {
  effectivePayroll,
  getApronStatus,
  getCurrentCap,
  roomToLine,
} from "@/lib/cap";
import { freeAgentClassYears } from "@/lib/freeAgency";
import { TEAM_BY_ABBR } from "@/lib/teams";
import type { TeamAbbr } from "@/lib/types";
import { ApronBadge } from "@/components/Badge";
import { TeamLogo } from "@/components/TeamLogo";

export default function HomePage() {
  const data = getAppData();
  const cap = getCurrentCap(data.capThresholds);
  const fresh = dataFreshness(data);
  const faCount = data.contracts.filter((c) => c.freeAgencyYear != null).length;
  const faYears = freeAgentClassYears(data.contracts);
  const nextFa = faYears[0];

  const teamRows = data.teamPayrolls
    .map((p) => {
      const spending = effectivePayroll(p);
      const team = TEAM_BY_ABBR[p.team as TeamAbbr];
      return {
        team,
        spending,
        status: getApronStatus(spending, cap),
        roomTax: roomToLine(spending, cap.luxuryTax),
      };
    })
    .filter((r) => r.team)
    .sort((a, b) => b.spending - a.spending);

  const leaguePayroll = teamRows.reduce((s, r) => s + r.spending, 0);

  const statusCounts = { second: 0, first: 0, tax: 0, under: 0 };
  for (const r of teamRows) {
    if (r.status === "second-apron") statusCounts.second += 1;
    else if (r.status === "first-apron") statusCounts.first += 1;
    else if (r.status === "tax") statusCounts.tax += 1;
    else if (r.status === "under-cap") statusCounts.under += 1;
  }

  const deepLinks = [
    {
      href: "/teams?sort=payroll",
      title: "Second-apron teams",
      body: `${statusCounts.second} teams at or above the line`,
    },
    {
      href: nextFa ? `/free-agents?view=${encodeURIComponent(nextFa)}` : "/free-agents",
      title: nextFa ? `${nextFa} free agents` : "Free agents",
      body: "Browse unrestricted and restricted players",
    },
    {
      href: "/salaries?status=po",
      title: "Player options",
      body: "Outstanding player decisions",
    },
    {
      href: "/salaries?status=ufa&sort=salary&dir=desc",
      title: "UFAs by salary",
      body: "Highest current salary first",
    },
    {
      href: "/draft?round=1",
      title: "First-round picks",
      body: "Current ownership by team and year",
    },
    {
      href: "/salaries?age=u25&sort=salary&dir=desc",
      title: "Under-25 contracts",
      body: "Highest salary first",
    },
    {
      href: "/stats?sort=pts&dir=desc",
      title: "Scoring leaders",
      body: "Per-game points, all players",
    },
    {
      href: "/stats/advanced?sort=tsPct&dir=desc",
      title: "Advanced efficiency",
      body: "TS%, eFG%, EFF + glossary",
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-[var(--accent)]">{cap.season} season</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem]">
            League overview
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Payroll, cap position, contracts, and draft assets. Updated {fresh.label}.
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-y border-[var(--border-strong)] bg-[var(--surface)] sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["League payroll", formatMoney(leaguePayroll, true), "Active and dead money"],
          ["Salary cap", formatMoney(cap.salaryCap, true), null],
          ["Second apron", formatMoney(cap.secondApron, true), null],
          ["At second apron", statusCounts.second, `${statusCounts.first} at first apron`],
          ["Tax teams", statusCounts.tax, null],
          ["Free agents", faCount, "Tracked across all classes"],
        ].map(([label, value, hint]) => (
          <div
            key={String(label)}
            className="dashboard-metric border-l border-[var(--border)] px-3 py-3.5 sm:px-4"
          >
            <dt className="text-[11px] font-medium text-[var(--muted)]">{label}</dt>
            <dd className="mt-1 text-[19px] font-semibold tracking-[-0.025em] tabular-nums">{value}</dd>
            {hint && <dd className="mt-0.5 text-[10px] text-[var(--faint)]">{hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
            <h2 className="text-[14px] font-semibold">Highest payrolls</h2>
            <Link
              href="/teams?sort=payroll"
              className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)]"
            >
              All 30 →
            </Link>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {teamRows.slice(0, 8).map((r, i) => (
              <li key={r.team.abbr}>
                <Link
                  href={`/teams/${r.team.abbr.toLowerCase()}`}
                  className="flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span
                    className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--faint)]"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                    style={{ backgroundColor: `${r.team.primary}14` }}
                  >
                    <TeamLogo abbr={r.team.abbr} size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      {r.team.fullName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-semibold tabular-nums">
                      {formatMoney(r.spending, true)}
                    </div>
                    <div
                      className={`text-[10px] tabular-nums ${r.roomTax >= 0 ? "text-pos" : "text-neg"}`}
                    >
                      {formatDelta(r.roomTax)} tax
                    </div>
                  </div>
                  <ApronBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-3.5 py-2.5">
            <h2 className="text-[14px] font-semibold">Common reports</h2>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {deepLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="text-[13px] font-medium">{l.title}</span>
                  <span className="text-[11px] text-[var(--muted)] truncate max-w-[52%] text-right">
                    {l.body}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
