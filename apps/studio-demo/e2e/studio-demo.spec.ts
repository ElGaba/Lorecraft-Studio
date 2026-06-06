import { expect, test } from "@playwright/test";

test("studio demo loads prototypes, switches previews, and plays through hook zones", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Lorecraft Studio" })).toBeVisible();
  await expect(page.getByText("Agent-friendly cinematic story studio", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play Chapter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scene Editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Characters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assets" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gameplay Hooks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(page.getByLabel("Project")).toHaveValue("the-last-testimony");
  await expect(page.getByLabel("Project")).toContainText("Code Blue: Midnight Shift");
  await expect(page.getByLabel("Project")).toContainText("The Last Testimony");
  await expect(page.getByLabel("Project")).toContainText("The Clocktower Riddle");

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
  await expect(page.getByText("chapter-outline.md")).toBeVisible();
  await expect(page.getByText("evidence.json")).toBeVisible();
  await expect(page.getByText("variables.json")).toBeVisible();
  await expect(page.getByText("gameplay-sequences.json")).toBeVisible();
  await expect(page.getByText("animation-presets.json")).toBeVisible();
  await page.getByRole("button", { name: "Scenes", exact: true }).click();

  for (const mode of ["Mobile Landscape", "Mobile Portrait", "Tablet", "Desktop"]) {
    await page.getByRole("button", { name: mode }).click();
    await expect(page.getByRole("button", { name: mode })).toHaveAttribute("aria-pressed", "true");
  }

  await page.getByLabel("Project").selectOption("code-blue-midnight-shift");
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

  await page.getByLabel("Project").selectOption("the-last-testimony");
  await expect(page.getByRole("heading", { name: "Rain at the Courthouse" })).toBeVisible();
  await page.getByLabel("Project").selectOption("the-clocktower-riddle");
  await expect(page.getByRole("heading", { name: "Moonlit Square" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("the last testimony launches as a dedicated chapter playthrough", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Project")).toHaveValue("the-last-testimony");
  await page.getByRole("button", { name: "Play Chapter" }).click();

  await expect(page.getByRole("heading", { name: "The Last Testimony" })).toBeVisible();
  await expect(page.getByText("Chapter 1 Playthrough", { exact: true })).toBeVisible();
  await expect(page.getByText("Objective", { exact: true })).toBeVisible();
  await expect(page.getByText("Progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Fullscreen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart Chapter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exit Playthrough" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Rain at the Courthouse" })).toBeVisible();

  await page.getByRole("button", { name: "Exit Playthrough" }).click();
  await expect(page.getByRole("heading", { name: "Lorecraft Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();
});

test("the last testimony presents an image-backed courtroom visual novel scene", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Project").selectOption("the-last-testimony");
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
  await expect(page.getByText("The elevator log was not my business. I stayed where visitors could see me.")).toBeVisible();
  await expect(page.getByText("I left through the front doors before the alarm. I never went below the lobby.")).not.toBeVisible();
  await expect(page.getByText("The court record says otherwise. Let's test the exact minute you say never happened.")).not.toBeVisible();
  await expect(page.getByText("present-contradiction")).not.toBeVisible();

  await page.getByRole("button", { name: "Advance testimony" }).click();
  await expect(page.getByText("I left through the front doors before the alarm. I never went below the lobby.")).toBeVisible();
  await expect(page.getByText("The court record says otherwise. Let's test the exact minute you say never happened.")).not.toBeVisible();
  await expect(page.getByText("The elevator log was not my business. I stayed where visitors could see me.")).not.toBeVisible();
  await expect(page.getByText("present-contradiction")).not.toBeVisible();

  await page.getByRole("button", { name: "Start cross-examination" }).click();
  await expect(page.getByRole("heading", { name: "Find the contradiction" })).toBeVisible();
  await expect(page.getByText("present-contradiction")).toBeVisible();
  await expect(page.getByText("Statement 1 / 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "The elevator log was not my business. I stayed where visitors could see me." })).toBeVisible();
  await page.getByRole("button", { name: "Next statement" }).click();
  await expect(page.getByText("Statement 2 / 2")).toBeVisible();
  await expect(page.getByText("Witness Statement", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Press Statement" }).click();
  await expect(page.getByText("HOLD IT!", { exact: true })).toBeVisible();
  await expect(page.getByText("The basement denial becomes the pressure point.")).toBeVisible();
  await expect(page.getByRole("button", { name: "I left through the front doors before the alarm. I never went below the lobby." })).toBeVisible();
  await expect(page.getByText("Select Evidence", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Present Evidence" })).toBeDisabled();
  await page.getByRole("button", { name: "I left through the front doors before the alarm. I never went below the lobby." }).click();
  await page.getByRole("button", { name: "Elevator Keycard" }).click();
  await expect(page.getByText("Selected Evidence: Elevator Keycard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Present Evidence" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Present Evidence" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Press Witness" })).toBeVisible();

  await page.getByRole("button", { name: "Present Evidence" }).click();
  await expect(page.getByRole("heading", { name: "Witness Cracks" })).toBeVisible();
  await expect(page.getByText("OBJECTION!", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scene background: Witness Cracks" })).toBeVisible();
  await expect(page.getByText("I only went down because I heard the alarm before it sounded upstairs.")).toBeVisible();
});

test("the last testimony supports inspection and chain-of-custody gameplay modes", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Project").selectOption("the-last-testimony");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Inspect the basement elevator log" }).click();
  await page.getByRole("button", { name: "Return to court with the keycard" }).click();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Start cross-examination" }).click();
  await page.getByRole("button", { name: "Next statement" }).click();
  await page.getByRole("button", { name: "I left through the front doors before the alarm. I never went below the lobby." }).click();
  await page.getByRole("button", { name: "Elevator Keycard" }).click();
  await page.getByRole("button", { name: "Present Evidence" }).click();

  await expect(page.getByRole("heading", { name: "Witness Cracks" })).toBeVisible();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Review choices" }).click();
  await page.getByRole("button", { name: "Reveal the window contradiction" }).click();

  await expect(page.getByRole("heading", { name: "Rain on the Inside" })).toBeVisible();
  await page.getByRole("button", { name: "Start inspection" }).click();
  await expect(page.getByRole("heading", { name: "Photo Inspection" })).toBeVisible();
  await expect(page.getByText("The Stain Beneath the Sill", { exact: true })).toBeVisible();
  await expect(page.getByText("Tap the narrow stain below the latch.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark the stain beneath the sill" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tap the rain reflection" })).toBeVisible();

  await page.getByRole("button", { name: "Mark the stain beneath the sill" }).click();
  await expect(page.getByRole("heading", { name: "Staged Window Path" })).toBeVisible();

  await page.getByRole("button", { name: "Build the closing argument" }).click();
  await expect(page.getByRole("heading", { name: "Photo Envelope Chain" })).toBeVisible();
  await expect(page.getByText("Ione Marr", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log the late photo envelope" }).click();

  await expect(page.getByRole("heading", { name: "Closing Argument", exact: true })).toBeVisible();
  await expect(page.getByText("Sealed Photo Envelope")).toBeVisible();
  await expect(page.getByText("Witness Script Fragment")).toBeVisible();
  await expect(page.getByText("chainOfCustody: 1")).toBeVisible();
});

test("the last testimony punishes presenting the right evidence on the wrong statement", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Project").selectOption("the-last-testimony");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Inspect the basement elevator log" }).click();
  await page.getByRole("button", { name: "Return to court with the keycard" }).click();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Start cross-examination" }).click();

  await expect(page.getByText("Statement 1 / 2")).toBeVisible();
  await page.getByRole("button", { name: "The elevator log was not my business. I stayed where visitors could see me." }).click();
  await page.getByRole("button", { name: "Elevator Keycard" }).click();
  await expect(page.getByText("Selected Statement: 1")).toBeVisible();
  await expect(page.getByText("Selected Evidence: Elevator Keycard")).toBeVisible();

  await page.getByRole("button", { name: "Present Evidence" }).click();
  await expect(page.getByRole("heading", { name: "Objection Sustained" })).toBeVisible();
  await expect(page.getByText("The court will not follow speculation into the basement.")).toBeVisible();
});
