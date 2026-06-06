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
  await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scene Editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Characters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gameplay Hooks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.getByLabel("Prototype")).toContainText("Code Blue: Midnight Shift");
  await expect(page.getByLabel("Prototype")).toContainText("The Last Testimony");
  await expect(page.getByLabel("Prototype")).toContainText("The Clocktower Riddle");

  await page.getByRole("button", { name: "Generate/Improve Scene Draft" }).click();
  await expect(page.getByRole("dialog", { name: "Local Agent Prompt" })).toBeVisible();
  await expect(page.getByText("improve_scene", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close prompt" }).click();

  await page.getByRole("button", { name: "Characters" }).click();
  await expect(page.getByRole("heading", { name: "Character Editor" })).toBeVisible();
  await page.getByRole("button", { name: "Assets" }).click();
  await expect(page.getByRole("heading", { name: "Asset Prompt Manager" })).toBeVisible();
  await page.getByRole("button", { name: "Gameplay Hooks" }).click();
  await expect(page.getByRole("heading", { name: "Gameplay Hook Manager" })).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Export Package" })).toBeVisible();
  await expect(page.getByText("story-bible.md")).toBeVisible();
  await page.getByRole("button", { name: "Scenes", exact: true }).click();

  for (const mode of ["Mobile Landscape", "Mobile Portrait", "Tablet", "Desktop"]) {
    await page.getByRole("button", { name: mode }).click();
    await expect(page.getByRole("button", { name: mode })).toHaveAttribute("aria-pressed", "true");
  }

  await page.getByLabel("Prototype").selectOption("code-blue-midnight-shift");
  await page.getByRole("button", { name: "Play", exact: true }).click();
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

test("the last testimony presents an image-backed courtroom visual novel scene", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Prototype").selectOption("the-last-testimony");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Inspect the basement elevator log" }).click();
  await page.getByRole("button", { name: "Return to court with the keycard" }).click();

  await expect(page.getByRole("heading", { name: "Witness Stand" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scene background: Witness Stand" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Mara Vey" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Lyra Mont" })).toBeVisible();
  await expect(page.getByText("Court Record", { exact: true })).toBeVisible();

  await expect(page.getByText("The court record says otherwise. Let's test the exact minute you say never happened.")).toBeVisible();
  await expect(page.getByText("I left through the front doors before the alarm. I never went below the lobby.")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Find the contradiction" })).not.toBeVisible();
  await expect(page.getByText("present-contradiction")).not.toBeVisible();

  await page.getByRole("button", { name: "Advance testimony" }).click();
  await expect(page.getByText("I left through the front doors before the alarm. I never went below the lobby.")).toBeVisible();
  await expect(page.getByText("The court record says otherwise. Let's test the exact minute you say never happened.")).not.toBeVisible();
  await expect(page.getByText("present-contradiction")).not.toBeVisible();

  await page.getByRole("button", { name: "Start cross-examination" }).click();
  await expect(page.getByRole("heading", { name: "Find the contradiction" })).toBeVisible();
  await expect(page.getByText("present-contradiction")).toBeVisible();
  await expect(page.getByRole("button", { name: "Present Evidence" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Press Witness" })).toBeVisible();
});
