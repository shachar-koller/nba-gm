import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSiteUrl, siteOrigin } from "./siteUrl.ts";

describe("site URL resolution", () => {
  it("prefers the configured public production origin", () => {
    const environment = {
      NEXT_PUBLIC_SITE_URL: "https://nba.example/path?ignored=yes",
      VERCEL_PROJECT_PRODUCTION_URL: "fallback.vercel.app",
    };
    assert.equal(siteOrigin(environment), "https://nba.example");
  });

  it("adds HTTPS to Vercel-provided hostnames", () => {
    assert.equal(
      resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "nba.vercel.app" }).href,
      "https://nba.vercel.app/"
    );
  });

  it("uses localhost for local builds without a configured host", () => {
    assert.equal(siteOrigin({}), "http://localhost:3000");
  });
});
