import { expect, test } from "@playwright/test";
import appData from "../../src/data/app-data.json" with { type: "json" };

const DAY_MS = 24 * 60 * 60 * 1_000;

test("the freshness warning ages from the browser clock", async ({ page }) => {
  const snapshotTime = Date.parse(appData.updatedAt);
  await page.clock.install({ time: snapshotTime + 60_000 });
  await page.goto("/");

  await expect(page.getByRole("status")).toHaveCount(0);

  await page.clock.fastForward(8 * DAY_MS);

  await expect(page.getByRole("status")).toContainText(
    "Data update delayed."
  );
  await expect(page.getByRole("status")).toContainText("8 days ago");
});
