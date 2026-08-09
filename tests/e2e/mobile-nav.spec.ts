import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("the active primary destination scrolls into view on mobile", async ({
  page,
}) => {
  await page.goto("/stats/advanced");

  const nav = page.getByRole("navigation", { name: "Primary" });
  const active = nav.getByRole("link", { name: "Adv. Stats" });
  await expect(active).toHaveAttribute("aria-current", "page");
  await expect
    .poll(() => nav.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  const navBox = await nav.boundingBox();
  const activeBox = await active.boundingBox();
  expect(navBox).not.toBeNull();
  expect(activeBox).not.toBeNull();
  expect(activeBox!.x).toBeGreaterThanOrEqual(navBox!.x - 1);
  expect(activeBox!.x + activeBox!.width).toBeLessThanOrEqual(
    navBox!.x + navBox!.width + 1
  );
});
