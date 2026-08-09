import { expect, test } from "@playwright/test";

const ROUTES = [
  ["/", "League overview"],
  ["/draft", "Draft Picks"],
  ["/cap", "Salary Cap & Aprons"],
  ["/salaries", "Player Salaries"],
  ["/free-agents", "Free Agent Classes"],
  ["/teams", "Teams"],
  ["/teams/bos", "Boston Celtics"],
  ["/staff", "GMs & Head Coaches"],
  ["/stats", "Player Stats"],
  ["/stats/advanced", "Advanced Stats"],
  ["/methodology", "Sources & methodology"],
] as const;

for (const [path, heading] of ROUTES) {
  test(`${path} renders its primary content`, async ({ page }) => {
    const response = await page.goto(path);

    expect(
      response?.ok(),
      `${path} should return a successful response`
    ).toBeTruthy();
    await expect(
      page.getByRole("heading", { level: 1, name: heading })
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
}

test("an unknown player profile returns 404", async ({ page }) => {
  const response = await page.goto("/players/not-a-real-player");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" })
  ).toBeVisible();
});
