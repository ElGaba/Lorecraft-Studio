import { expect, test } from "@playwright/test";

test("studio demo loads prototypes, switches previews, and plays through hook zones", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AdventureKit" })).toBeVisible();
  await expect(page.getByLabel("Prototype")).toContainText("Code Blue: Midnight Shift");
  await expect(page.getByLabel("Prototype")).toContainText("The Last Testimony");
  await expect(page.getByLabel("Prototype")).toContainText("The Clocktower Riddle");

  for (const mode of ["Mobile Landscape", "Mobile Portrait", "Tablet", "Desktop"]) {
    await page.getByRole("button", { name: mode }).click();
    await expect(page.getByRole("button", { name: mode })).toHaveAttribute("aria-pressed", "true");
  }

  await page.getByLabel("Prototype").selectOption("code-blue-midnight-shift");
  await expect(page.getByRole("heading", { name: "Bay Seven Alert" })).toBeVisible();
  await page.getByRole("button", { name: "Pull a clean rhythm strip" }).click();
  await expect(page.getByRole("heading", { name: "rapid-assessment" })).toBeVisible();
  await page.getByRole("button", { name: "Simulate Success" }).click();
  await expect(page.getByRole("heading", { name: "Medication Crosscheck" })).toBeVisible();
  await page.getByRole("button", { name: "Simulate Success" }).click();
  await expect(page.getByRole("heading", { name: "Safe Handoff" })).toBeVisible();
  await page.getByRole("button", { name: "Send the patient upstairs with the right story" }).click();
  await expect(page.getByRole("heading", { name: "Safe Transfer" })).toBeVisible();

  await page.getByLabel("Prototype").selectOption("the-last-testimony");
  await expect(page.getByRole("heading", { name: "Rain at the Courthouse" })).toBeVisible();
  await page.getByLabel("Prototype").selectOption("the-clocktower-riddle");
  await expect(page.getByRole("heading", { name: "Moonlit Square" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
