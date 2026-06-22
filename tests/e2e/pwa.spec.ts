import { expect, test } from "@playwright/test";

test("is installable and registers an updateable service worker", async ({ page, request }) => {
  await page.goto("/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest.name).toContain("Seine Studio");
  expect(manifest.icons.length).toBeGreaterThan(0);
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
  expect(manifest.icons.every((icon: { type?: string }) => icon.type === "image/png")).toBe(true);

  const canUpdate = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return typeof registration.update === "function";
  });
  expect(canUpdate).toBe(true);
});

test("Accounting is reachable from desktop navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Desktop navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "Accounting" }).click();
  await expect(page).toHaveURL(/\/accounting/);
  await expect(page.getByText("Revenue Collected", { exact: true })).toBeVisible();
});

test("Accounting is reachable through the mobile More sheet", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile navigation check");
  await page.goto("/");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Accounting" }).click();
  await expect(page).toHaveURL(/\/accounting/);
});

test("the cached shell reloads offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("header").getByText("Overview", { exact: true })).toBeVisible();
});

test("Accounting records become action-ready cards on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile layout check");
  await page.goto("/accounting");
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  const invoiceCard = page.locator("article").filter({ hasText: "INV-001" });
  await expect(invoiceCard).toBeVisible();
  await expect(invoiceCard.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(invoiceCard.getByRole("button", { name: "Delete" })).toBeVisible();
});
