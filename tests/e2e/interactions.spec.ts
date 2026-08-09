import { expect, test } from "@playwright/test";

test("salary filters hydrate from and persist in the URL", async ({ page }) => {
  await page.goto("/salaries?team=BOS&status=po");

  const filters = page.locator("[data-sticky-filters]");
  const teamFilter = filters.getByRole("combobox", {
    name: "Team",
    exact: true,
  });
  const statusFilter = filters.getByRole("combobox", {
    name: "Status",
    exact: true,
  });
  const ageFilter = filters.getByRole("combobox", {
    name: "Age",
    exact: true,
  });
  await expect(teamFilter).toHaveValue("BOS");
  await expect(statusFilter).toHaveValue("po");

  await ageFilter.selectOption("u25");
  await expect(page).toHaveURL(/[?&]age=u25(?:&|$)/);
  await expect(page.locator('button[title="Remove Age filter"]')).toContainText(
    "Under 25"
  );

  await page.reload();
  await expect(ageFilter).toHaveValue("u25");
});

test("a salary row opens its player detail flow", async ({ page }) => {
  await page.goto("/salaries");

  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow).toBeVisible();
  const trigger = firstRow.locator("td").first().locator("button, a").first();
  const playerName = (await trigger.innerText()).split("\n")[0].trim();

  await trigger.click();
  await expect
    .poll(async () => {
      const hasDialog = (await page.getByRole("dialog").count()) > 0;
      return hasDialog || /\/players\//.test(page.url());
    })
    .toBe(true);

  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) > 0) {
    await expect(dialog).toContainText(playerName);
    await dialog.getByRole("link", { name: "Full player profile →" }).click();
  }

  await expect(page).toHaveURL(/\/players\/[^/?#]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: playerName })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: playerName })
  ).toBeVisible();
});

test("stats and legacy source links resolve to one canonical player profile", async ({
  page,
}) => {
  await page.goto("/stats?q=Jayson%20Tatum");
  await page.getByRole("link", { name: "Jayson Tatum", exact: true }).click();

  await expect(page).toHaveURL(/\/players\/jayson-tatum$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Jayson Tatum" })
  ).toBeVisible();
  await expect(page.getByText("Contract + stats", { exact: true })).toBeVisible();

  await page.goto("/players/spotrac-23598");
  await expect(page).toHaveURL(/\/players\/jayson-tatum$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Jayson Tatum" })
  ).toBeVisible();
});

test("CSV export downloads the filtered report", async ({ page }) => {
  await page.goto("/teams?conf=East");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("nba-teams.csv");
  expect(await download.path()).not.toBeNull();
});

test("command palette finds and opens a team", async ({ page }) => {
  await page.goto("/");
  const openSearch = page.getByRole("button", { name: /Open search/ });
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(async () => {
    await openSearch.click();
    await expect(palette).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await palette.getByRole("combobox").fill("Boston Celtics");
  await palette.getByRole("option", { name: /Boston Celtics/ }).click();

  await expect(page).toHaveURL(/\/teams\/bos$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Boston Celtics" })
  ).toBeVisible();
});
