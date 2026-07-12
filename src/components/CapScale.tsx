"use client";

import type { CapThresholds } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function CapScale({
  cap,
  payroll,
  compact = false,
}: {
  cap: CapThresholds;
  payroll?: number | null;
  compact?: boolean;
}) {
  // The useful operating range starts at the league salary floor. Keeping
  // the floor at 0% makes the spacing between the actual spending lines
  // easier to read than anchoring the chart to an arbitrary $0 origin.
  const min = cap.salaryFloor;
  const max = cap.secondApron * 1.08;
  const range = max - min;
  const pct = (v: number) =>
    Math.min(100, Math.max(0, ((v - min) / range) * 100));

  const markers = [
    { key: "cap", label: "Cap", value: cap.salaryCap, color: "var(--pos)" },
    { key: "tax", label: "Tax", value: cap.luxuryTax, color: "var(--warn)" },
    { key: "a1", label: "1st", value: cap.firstApron, color: "var(--accent)" },
    { key: "a2", label: "2nd", value: cap.secondApron, color: "var(--neg)" },
  ];

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
      {!compact && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            {cap.season} spending lines
          </h3>
          <span className="micro">Salary floor to 2nd apron + 8%</span>
        </div>
      )}

      <div className="relative mt-8 mb-2 h-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
        {/* Zone bands */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full"
          style={{ width: `${pct(cap.luxuryTax)}%`, background: "var(--zone-under)" }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${pct(cap.luxuryTax)}%`,
            width: `${pct(cap.firstApron) - pct(cap.luxuryTax)}%`,
            background: "var(--zone-tax)",
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${pct(cap.firstApron)}%`,
            width: `${pct(cap.secondApron) - pct(cap.firstApron)}%`,
            background: "var(--zone-first)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-full"
          style={{
            left: `${pct(cap.secondApron)}%`,
            background: "var(--zone-second)",
          }}
        />

        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${pct(m.value)}%` }}
          >
            <div
              className="h-4 w-0.5 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: m.color }}
            />
            <div className="absolute left-1/2 bottom-5 -translate-x-1/2 whitespace-nowrap text-center">
              <div className="text-[10px] font-semibold" style={{ color: m.color }}>
                {m.label}
              </div>
              {!compact && (
                <div className="text-[10px] text-[var(--muted)] tabular-nums">
                  {formatMoney(m.value, true)}
                </div>
              )}
            </div>
          </div>
        ))}

        {payroll != null && (
          <div
            className="absolute -top-1 bottom-0 z-[1]"
            style={{ left: `${pct(payroll)}%` }}
            title={`Payroll ${formatMoney(payroll)}`}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
              {formatMoney(payroll, true)}
            </div>
            <div className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-[var(--accent)]" />
          </div>
        )}
      </div>

      {!compact && (
        <div className="relative mt-1 h-4 text-[10px] text-[var(--muted)] tabular-nums">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{ left: `${t * 100}%` }}
            >
              {formatMoney(min + range * t, true)}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {markers.map((m) => (
            <div
              key={m.key}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
            >
              <div className="label-caps" style={{ color: m.color }}>
                {m.label}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums">
                {formatMoney(m.value, true)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact 6px track for team cards — scan distance to lines in one glance. */
export function TeamCapMeter({
  payroll,
  cap,
  className,
}: {
  payroll: number;
  cap: CapThresholds;
  className?: string;
}) {
  const max = cap.secondApron * 1.08;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));

  return (
    <div className={className}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct(cap.luxuryTax)}%`, background: "var(--zone-under)" }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${pct(cap.luxuryTax)}%`,
            width: `${Math.max(0, pct(cap.firstApron) - pct(cap.luxuryTax))}%`,
            background: "var(--zone-tax)",
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${pct(cap.firstApron)}%`,
            width: `${Math.max(0, pct(cap.secondApron) - pct(cap.firstApron))}%`,
            background: "var(--zone-first)",
          }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]"
          style={{ left: `${pct(payroll)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-[var(--faint)]">
        <span>cap</span>
        <span>tax</span>
        <span>1st</span>
        <span>2nd</span>
      </div>
    </div>
  );
}
