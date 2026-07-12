import { classNames } from "@/lib/format";
import type { OptionType } from "@/lib/types";
import { apronStatusLabel, type ApronStatus } from "@/lib/cap";

/** Semantic only: pos | warn | neg | neutral | accent */
const optionStyles: Record<OptionType, string> = {
  none: "badge-neutral",
  player: "badge-accent",
  team: "badge-neutral",
  ufa: "badge-pos",
  rfa: "badge-warn",
  qualifying: "badge-warn",
  "two-way": "badge-neutral",
  "non-guaranteed": "badge-neg",
  estimate: "badge-neutral",
};

const optionLabels: Record<OptionType, string> = {
  none: "",
  player: "PO",
  team: "TO",
  ufa: "UFA",
  rfa: "RFA",
  qualifying: "QO",
  "two-way": "TW",
  "non-guaranteed": "NG",
  estimate: "Est.",
};

export function Badge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={classNames(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-transparent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

export function OptionBadge({ option }: { option: OptionType }) {
  if (!option || option === "none") return null;
  return (
    <Badge className={optionStyles[option]} title={optionLabels[option]}>
      {optionLabels[option]}
    </Badge>
  );
}

export function ProtectionBadge({ text }: { text: string }) {
  return (
    <Badge className="badge-warn" title={text}>
      Protected
    </Badge>
  );
}

export function SwapBadge() {
  return <Badge className="badge-accent">Swap</Badge>;
}

export function ConditionalBadge() {
  return <Badge className="badge-neutral">Conditional</Badge>;
}

const apronStyles: Record<ApronStatus, string> = {
  "under-cap": "badge-pos",
  "over-cap": "badge-neutral",
  tax: "badge-warn",
  "first-apron": "badge-accent",
  "second-apron": "badge-neg",
};

export function ApronBadge({ status }: { status: ApronStatus }) {
  return (
    <Badge className={apronStyles[status]}>{apronStatusLabel(status)}</Badge>
  );
}
