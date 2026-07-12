# NBA Front Office

A focused reference site for browsing NBA **draft pick ownership**, **salary-cap / apron thresholds**, **player contracts**, **free-agent classes**, and **team dashboards**.

Built for clarity: front-office data organization over trade machines, logins, or sims.

## Features

| Tab | What you get |
| --- | --- |
| **Draft Picks** | Ownership, swaps, protections; capital matrix + top owners; CSV export |
| **Salary Cap** | Cap / tax / aprons, scale, CBA glossary, restriction bands |
| **Player Salaries** | Multi-season $, % of cap, options, guarantees, notes; position/age filters; URL-synced filters; CSV |
| **Free Agents** | Classes by year (UFA/RFA), cap holds (est.), next expiring board, two-way bucket |
| **Teams** | Apron status from **active + dead** payroll, multi-year projection, draft capital matrix, roster with FA years |

## Apron status (important)

Team apron badges use **active roster salaries + dead money**, not Spotrac “Total Cap Allocations.”

Total allocations include free-agent holds and incomplete-roster charges, which overstates second-apron teams (~half the league vs ~1–3 in reality). Allocations are still shown on team cards as secondary context.

## Data sources

| Domain | Source | Notes |
| --- | --- | --- |
| Contracts & payrolls | **[Spotrac](https://www.spotrac.com/nba)** | Live HTML scrape |
| Draft rights | **Spotrac** future picks | Protections / swaps when published |
| Cap thresholds | **NBA official announcements** | e.g. 2026-27 cap $164.961M |
| Team logos | **ESPN CDN** | Public assets |

```bash
npm run refresh   # re-scrape Spotrac → src/data/app-data.json
```

Be polite: the script rate-limits (~600ms between team pages). Re-run after free agency, the draft, or big trades.

## Quick start

```bash
npm install
npm run refresh   # optional if snapshot already present
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build && npm start   # production
```

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** v4
- Client tables: search, filter, sort, sticky headers/columns, CSV export
- URL-synced filters on list pages

## Project layout

```
src/app/           # Routes: /, /draft, /cap, /salaries, /free-agents, /teams, /teams/[abbr]
src/components/    # Nav, tables, badges, filters, team UI
src/lib/           # Types, teams, cap, free agency, CSV, URL state, data loaders
src/data/          # app-data.json (generated)
scripts/           # refresh-data.mjs live scraper
```

## Out of scope (by design)

Trade machine, login, community features, full CBA simulators — deferred so the reference stays browsable and fast.
