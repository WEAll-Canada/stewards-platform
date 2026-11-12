import { expect, test } from "@playwright/test";

test("home page loads with a heading", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toBeVisible();
});

test("messages page shows seed data and accepts a new message", async ({ page }) => {
  await page.goto("/messages");
  await expect(page.getByText("This is a sample message from the seed data.")).toBeVisible();

  const body = `Hello from the page test ${Date.now()}`;
  await page.getByLabel("Name").fill("Page Test");
  await page.getByLabel("Message").fill(body);
  // Wait for the Turnstile spam check (test keys always pass) to hand the form its token.
  await expect(page.locator('[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText(body)).toBeVisible();
});
