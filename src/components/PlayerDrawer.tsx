"use client";

import Link from "next/link";
import type { PlayerContract } from "@/lib/types";
import { formatMoney, formatPct } from "@/lib/format";
import {
  effectiveFreeAgencyType,
  effectiveFreeAgencyYear,
  faCapHold,
  timingOptions,
} from "@/lib/freeAgency";
import { Drawer } from "./Drawer";
import { OptionBadge } from "./Badge";
import { TeamChip } from "./TeamLogo";

export function PlayerDrawer({
  player,
  season,
  onClose,
}: {
  player: PlayerContract | null;
  season: string;
  onClose: () => void;
}) {
  if (!player) return null;

  const faYear = effectiveFreeAgencyYear(player);
  const faType = effectiveFreeAgencyType(player);
  const hold = faCapHold(player);
  const opts = timingOptions(player, faYear);

  return (
    <Drawer
      open={Boolean(player)}
      onClose={onClose}
      wide
      title={
        <div>
          <div>{player.player}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-normal text-[var(--muted)]">
            <TeamChip abbr={player.team} showName />
            <span>
              {player.position || "—"}
              {player.age != null ? ` · ${player.age}` : ""}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Meta label="Current salary" value={formatMoney(player.currentSalary)} />
          <Meta label="Guaranteed*" value={formatMoney(player.guaranteed, true)} />
          <Meta label="Contract years" value={player.contractYears || "—"} />
          <Meta
            label="Free agency"
            value={
              faYear ? (
                <span className="inline-flex items-center gap-1.5">
                  {faYear}
                  {faType && (
                    <OptionBadge option={faType === "UFA" ? "ufa" : "rfa"} />
                  )}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Meta
            label="Cap hold (est.)"
            value={hold.amount != null ? formatMoney(hold.amount, true) : "—"}
          />
          <Meta
            label="Team page"
            value={
              <Link
                href={`/teams/${player.team.toLowerCase()}`}
                className="text-[var(--accent)] hover:underline"
                onClick={onClose}
              >
                {player.team} dashboard →
              </Link>
            }
          />
        </div>

        {player.notes?.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Notes
            </h3>
            <ul className="space-y-1.5">
              {player.notes.map((n) => (
                <li
                  key={n}
                  className="rounded-[var(--radius-sm)] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2.5 py-1.5 text-[12px] text-[var(--warn)]"
                >
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        {opts.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Options before FA
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {opts.map((o) => (
                <span
                  key={`${o.season}-${o.option}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs"
                >
                  <OptionBadge option={o.option} />
                  <span className="text-[var(--muted)]">{o.season}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Year-by-year
          </h3>
          {player.salaries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No salary rows listed.</p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--table-head)]">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-3 py-2">Season</th>
                    <th className="px-3 py-2 text-right">Salary</th>
                    <th className="px-3 py-2 text-right">% Cap</th>
                    <th className="px-3 py-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {player.salaries.map((s) => {
                    const isCurrent = s.season === season;
                    return (
                      <tr
                        key={s.season}
                        className={`border-t border-[var(--border)]/70 ${isCurrent ? "bg-[var(--accent-soft)]/40" : ""}`}
                      >
                        <td className="px-3 py-1.5 font-medium tabular-nums">
                          {s.season}
                          {isCurrent && (
                            <span className="ml-1.5 text-[10px] font-normal text-[var(--accent)]">
                              now
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {s.amount != null
                            ? formatMoney(s.amount)
                            : s.display || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--muted)]">
                          {s.pctOfCap != null ? formatPct(s.pctOfCap) : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <OptionBadge option={s.option} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-[11px] text-[var(--muted)]">
          * Guaranteed is an estimate from remaining listed years. Cap hold parsed
          from free-agency display rows when present.
        </p>
      </div>
    </Drawer>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function PlayerNameButton({
  player,
  onOpen,
  subtitle,
}: {
  player: PlayerContract;
  onOpen: (p: PlayerContract) => void;
  subtitle?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(player)}
      className="group/name text-left"
    >
      <span className="font-semibold group-hover/name:text-[var(--accent)] transition-colors">
        {player.player}
      </span>
      {subtitle != null && (
        <span className="block text-[11px] text-[var(--muted)] font-normal">
          {subtitle}
        </span>
      )}
    </button>
  );
}
