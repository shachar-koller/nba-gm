import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  playerSourceAlias,
  validatePlayerIdentityRegistry,
} from "./player-profile-registry.mjs";

describe("player identity registry", () => {
  it("accepts persisted and current source aliases", () => {
    const registry = {
      version: 1,
      sources: {
        "spotrac-42": "stable-player",
        "espn-99": "stable-player",
        "spotrac-old": "historical-player",
      },
    };
    const result = validatePlayerIdentityRegistry(registry, {
      contracts: [{ id: "42" }],
      players: [{ id: "99" }],
    });
    assert.deepEqual(result, { aliases: 3, canonicalIds: 2 });
  });

  it("rejects a missing current source alias", () => {
    assert.throws(
      () =>
        validatePlayerIdentityRegistry(
          { version: 1, sources: {} },
          { contracts: [{ id: "42" }] }
        ),
      /missing current source alias spotrac-42/
    );
  });

  it("normalizes source IDs into safe route aliases", () => {
    assert.equal(playerSourceAlias("espn", " A/99 "), "espn-a-99");
  });
});
