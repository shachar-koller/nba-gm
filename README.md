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
| **Players** | Shareable profiles combining contract terms, salary history, free-agency timing, and season statistics |
| **GMs / Coaches** | League-wide front-office and head-coach directory |
| **Stats** | League-wide per-game counting stats (PTS/REB/AST/STL/BLK/…); sortable columns; filters + CSV |
| **Advanced** | TS%, eFG%, 3PAr, FTr, TOV%, AST/TO, EFF, stocks — plus a glossary on how to use each metric |
| **Methodology** | Snapshot timestamps, sources, calculations, validation process, and known limitations |

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
| Player stats | **ESPN public statistics API** | Per-game + derived advanced rates |

```bash
npm run refresh         # Spotrac + ESPN stats → src/data/*.json
npm run refresh:stats   # stats only
npm run validate:data   # validate the committed snapshots without fetching
```

The refresh pipeline retries transient source failures, validates all-team coverage
and unexpected count drops, preserves player profile identities across snapshots,
and atomically replaces generated data only after validation. A scheduled GitHub
workflow proposes validated changes as a draft pull request for review rather than
publishing scraped data directly.

For the scheduled job to open that pull request, enable the repository setting
that allows GitHub Actions to create pull requests, or add a
`DATA_REFRESH_TOKEN` repository secret backed by a narrowly scoped GitHub App or
fine-grained token with contents and pull-request write access.

## Quick start

```bash
npm install
npm run refresh   # optional if snapshot already present
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For production builds, set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin so
canonical metadata and sitemap URLs point to the deployed site. Vercel's
production URL variables are used automatically when that value is omitted.

```bash
npm run build && npm start   # production
npm run ci                    # lint, types, unit/data tests, production build
npm run test:e2e:install      # one-time local Chromium install
npm run test:e2e              # Chromium route and interaction smoke tests
```

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** v4
- Client tables: search, filter, sort, sticky headers/columns, CSV export
- URL-synced filters on list pages

## Project layout

```
src/app/           # Report routes, team dashboards, player profiles, methodology
src/components/    # Nav, tables, badges, filters, team UI, stats clients
src/lib/           # Types, teams, cap, free agency, player stats, CSV, URL state
src/data/          # app-data.json + player-stats.json (generated)
scripts/           # refreshers, parsers, fixtures, integrity validation
tests/e2e/         # Playwright route, interaction, export, and mobile smoke tests
```

## Out of scope (by design)

Trade machine, login, community features, full CBA simulators — deferred so the reference stays browsable and fast.
