import { CapScale } from "@/components/CapScale";
import { PageHeader, StatCard } from "@/components/Filters";
import { InfoTip } from "@/components/Tooltip";
import {
  APRON_RESTRICTIONS,
  CAP_GLOSSARY,
  getCurrentCap,
} from "@/lib/cap";
import { getAppData } from "@/lib/data";
import { formatMoney } from "@/lib/format";

export const metadata = {
  title: "Salary Cap | NBA Front Office",
};

export default function CapPage() {
  const data = getAppData();
  const current = getCurrentCap(data.capThresholds);
  const seasons = data.capThresholds;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Salary Cap & Aprons"
        description="Official league spending thresholds and what changes when a team crosses each line. Numbers for the current season come from NBA announcements; history is included for context."
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label={
            <InfoTip label={CAP_GLOSSARY.salaryCap.title} text={CAP_GLOSSARY.salaryCap.detail} />
          }
          value={formatMoney(current.salaryCap, true)}
          hint={current.season}
        />
        <StatCard
          label={
            <InfoTip label={CAP_GLOSSARY.luxuryTax.title} text={CAP_GLOSSARY.luxuryTax.detail} />
          }
          value={formatMoney(current.luxuryTax, true)}
        />
        <StatCard
          label={
            <InfoTip label={CAP_GLOSSARY.firstApron.title} text={CAP_GLOSSARY.firstApron.detail} />
          }
          value={formatMoney(current.firstApron, true)}
        />
        <StatCard
          label={
            <InfoTip
              label={CAP_GLOSSARY.secondApron.title}
              text={CAP_GLOSSARY.secondApron.detail}
            />
          }
          value={formatMoney(current.secondApron, true)}
        />
      </div>

      <CapScale cap={current} />

      <section className="grid gap-4 lg:grid-cols-2">
        {(
          [
            ["salaryCap", CAP_GLOSSARY.salaryCap],
            ["salaryFloor", CAP_GLOSSARY.salaryFloor],
            ["luxuryTax", CAP_GLOSSARY.luxuryTax],
            ["firstApron", CAP_GLOSSARY.firstApron],
            ["secondApron", CAP_GLOSSARY.secondApron],
          ] as const
        ).map(([key, g]) => (
          <article
            key={key}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h3 className="text-base font-semibold">{g.title}</h3>
            <p className="mt-1 text-sm text-[var(--accent)] font-medium">{g.short}</p>
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{g.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-[13px] font-semibold">Restrictions by band</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["Under the cap", APRON_RESTRICTIONS.underCap, "emerald"],
              ["Over cap / under tax", APRON_RESTRICTIONS.overCapUnderTax, "lime"],
              ["Tax / under 1st apron", APRON_RESTRICTIONS.taxUnderFirstApron, "amber"],
              ["Above first apron", APRON_RESTRICTIONS.firstApron, "orange"],
              ["Above second apron", APRON_RESTRICTIONS.secondApron, "rose"],
            ] as const
          ).map(([title, items]) => (
            <div
              key={title}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3.5"
            >
              <h3 className="font-semibold text-sm mb-2">{title}</h3>
              <ul className="space-y-1.5 text-xs text-[var(--muted)] leading-snug">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[var(--accent)]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-2.5">
          <h2 className="text-[13px] font-semibold">Season-by-season thresholds</h2>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[var(--table-head)]">
              <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <th className="px-3 py-2.5 text-left">Season</th>
                <th className="px-3 py-2.5 text-right">Floor</th>
                <th className="px-3 py-2.5 text-right">Cap</th>
                <th className="px-3 py-2.5 text-right">Tax</th>
                <th className="px-3 py-2.5 text-right">1st Apron</th>
                <th className="px-3 py-2.5 text-right">2nd Apron</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s, i) => (
                <tr
                  key={s.season}
                  className={`border-b border-[var(--border)]/70 hover:bg-[var(--row-hover)] ${i % 2 === 1 ? "bg-[var(--row-stripe)]" : ""}`}
                >
                  <td className="px-3 py-2 font-semibold">{s.season}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.salaryFloor)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatMoney(s.salaryCap)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.luxuryTax)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.firstApron)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.secondApron)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {current.notes && (
          <p className="px-5 py-3 text-xs text-[var(--muted)] border-t border-[var(--border)]">
            {current.notes}
          </p>
        )}
      </section>
    </div>
  );
}
