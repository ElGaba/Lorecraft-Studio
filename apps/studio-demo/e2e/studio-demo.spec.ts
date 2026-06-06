import { expect, test, type Page } from "@playwright/test";

async function visibleButton(page: Page, buttonName: string) {
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const text = (await button.textContent())?.trim();
    if (text === buttonName && await button.isVisible()) {
      return button;
    }
  }

  return undefined;
}

async function clickVisibleButton(page: Page, buttonName: string) {
  const button = await visibleButton(page, buttonName);
  if (button) {
    await button.click();
    return;
  }

  await page.getByRole("button", { name: buttonName }).click();
}

async function revealChoice(page: Page, choiceName: string) {
  const choice = page.getByRole("button", { name: choiceName });
  const flowButtons = [
    "Begin final testimony",
    "Continue",
    "Choose courtroom tone",
    "Ask for one more question",
    "Choose your next move",
    "Review choices",
    "Advance testimony",
    "Start pressure choice",
    "Simulate Success"
  ];

  for (let step = 0; step < 12; step += 1) {
    if (await visibleButton(page, choiceName)) {
      return;
    }

    let acted = false;
    for (const buttonName of flowButtons) {
      if (await visibleButton(page, buttonName)) {
        await clickVisibleButton(page, buttonName);
        acted = true;
        break;
      }
    }

    if (!acted) {
      await page.waitForTimeout(100);
    }
  }

  await expect(choice).toBeVisible();
}

async function revealOpeningChoices(page: Page) {
  await revealChoice(page, "Inspect the basement elevator log");
}

async function enterBasementLog(page: Page) {
  await revealChoice(page, "Inspect the basement elevator log");
  await clickVisibleButton(page, "Inspect the basement elevator log");
}

async function inspectBasementLog(page: Page) {
  await enterBasementLog(page);
  const inspectLog = page.getByRole("button", { name: "Inspect the elevator log" });
  if (await inspectLog.isVisible()) {
    await inspectLog.click();
  } else {
    await page.getByRole("button", { name: "Start inspection" }).click();
  }
  await page.getByRole("button", { name: "Select the 11:42 row" }).click();
}

async function returnToCourtWithCrosscheck(page: Page) {
  await inspectBasementLog(page);
  await revealChoice(page, "Return to court with the cross-check");
  await page.getByRole("button", { name: "Return to court with the cross-check" }).click();
}

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
  await expect(page.getByRole("heading", { name: "The Verdict Before Dawn" })).toBeVisible();
  await page.getByLabel("Project").selectOption("the-clocktower-riddle");
  await expect(page.getByRole("heading", { name: "Moonlit Square" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("the last testimony launches as a dedicated chapter playthrough", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null
    });
    HTMLElement.prototype.requestFullscreen = function requestFullscreenMock() {
      const target = this.getAttribute("aria-label") ?? this.className.toString();
      (window as Window & typeof globalThis & { __fullscreenTarget?: string }).__fullscreenTarget = target;
      return Promise.resolve();
    };
  });
  await page.goto("/");

  await expect(page.getByLabel("Project")).toHaveValue("the-last-testimony");
  await page.getByRole("button", { name: "Play Chapter" }).click();

  const briefing = page.getByLabel("Case briefing");
  await expect(briefing.getByRole("heading", { name: "The Last Testimony" })).toBeVisible();
  await expect(briefing.getByRole("img", { name: "Mara Vey" })).toBeVisible();
  await expect(briefing.getByRole("img", { name: "Elias Vorn" })).toBeVisible();
  await expect(briefing.getByRole("img", { name: "Lyra Mont" })).toBeVisible();
  await expect(page.getByText("Elias Vorn will be convicted at dawn unless Mara breaks the last witness account before the judge ends the trial.")).toBeVisible();
  await expect(page.getByText("You play Mara Vey. Read the testimony, inspect the physical record, and present the contradiction hidden in Lyra's story.")).toBeVisible();
  await expect(page.getByText("Opening move: prove the window was staged.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Begin final testimony" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rain at the Courthouse" })).not.toBeVisible();

  await expect(page.locator(".chapter-title-lockup").getByRole("heading", { name: "The Last Testimony" })).toBeVisible();
  await expect(page.getByText("Chapter 1 Playthrough", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Current chapter objective")).not.toBeVisible();
  await expect(page.getByText("Progress", { exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Fullscreen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart Chapter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exit Playthrough" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio" })).not.toBeVisible();
  await expect(page.getByLabel("The Last Testimony game viewport")).toBeVisible();
  await expect(page.getByLabel("Inventory and evidence")).not.toBeVisible();
  await expect(page.getByLabel("Playthrough evidence access")).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);

  await page.getByRole("button", { name: "Enter Fullscreen" }).click();
  await expect.poll(() =>
    page.evaluate(() => (window as Window & typeof globalThis & { __fullscreenTarget?: string }).__fullscreenTarget)
  ).toBe("The Last Testimony game viewport");

  await page.getByRole("button", { name: "Begin final testimony" }).click();
  await expect(page.getByLabel("Current chapter objective").getByText("Objective", { exact: true })).toBeVisible();
  await expect(page.getByText("Progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Verdict Before Dawn" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Judge Arden Hale" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Mara Vey" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Advance testimony" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate Success" })).not.toBeVisible();
  await expect(page.getByText("Camera:")).not.toBeVisible();
  await expect(page.getByText("Prompt ready")).not.toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Choose courtroom tone" }).click();
  await expect(page.getByText("Court Pressure", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "One More Question" })).toBeVisible();
  await expect(page.getByText("witness-pressure-timed-choice")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Ask for one more question" })).toBeVisible();

  await page.getByRole("button", { name: "Exit Playthrough" }).click();
  await expect(page.getByRole("heading", { name: "Lorecraft Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();
});

test("the last testimony playthrough keeps investigation scenes image-backed", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play Chapter" }).click();
  await revealOpeningChoices(page);
  await inspectBasementLog(page);

  await expect(page.getByRole("heading", { name: "Records Crosscheck" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Scene background: Records Crosscheck" })).toBeVisible();
});

test("the last testimony exposes a chapter overview for production readiness", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("Project")).toHaveValue("the-last-testimony");
  await expect(page.getByRole("button", { name: "Chapter Overview" })).toBeVisible();
  await page.getByRole("button", { name: "Chapter Overview" }).click();

  const overview = page.getByLabel("Chapter overview");
  await expect(overview.getByRole("heading", { name: "Chapter Overview" })).toBeVisible();
  await expect(overview.getByText("Story Beats", { exact: true })).toBeVisible();
  await expect(overview.getByText("Gameplay Sequences", { exact: true })).toBeVisible();
  await expect(overview.getByText("Evidence Chain", { exact: true })).toBeVisible();
  await expect(overview.getByText("Branching Points", { exact: true })).toBeVisible();
  await expect(overview.getByText("Chapter Outcomes", { exact: true })).toBeVisible();
  await expect(overview.getByText("Reference Check", { exact: true })).toBeVisible();
  await expect(overview.getByText("Asset Readiness", { exact: true })).toBeVisible();
  await expect(overview.getByText("Rain at the Courthouse", { exact: true }).first()).toBeVisible();
  await expect(overview.getByText("present-contradiction")).toBeVisible();
  await expect(overview.getByText("Elevator Keycard", { exact: true })).toBeVisible();
  await expect(overview.getByText("timeline-revealed", { exact: true })).toBeVisible();
  await expect(overview.getByText("No broken references.")).toBeVisible();
});

test("the last testimony chapter playthrough resumes local progress until restarted", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Play Chapter" }).click();
  await enterBasementLog(page);
  await expect(page.getByRole("heading", { name: "Basement Log" })).toBeVisible();

  await page.getByRole("button", { name: "Exit Playthrough" }).click();
  await page.getByRole("button", { name: "Play Chapter" }).click();

  await expect(page.getByRole("heading", { name: "Basement Log" })).toBeVisible();
  await expect(page.getByText("Saved Progress", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Restart Chapter" }).click();
  await expect(page.getByLabel("Case briefing").getByRole("heading", { name: "The Last Testimony" })).toBeVisible();

  await page.getByRole("button", { name: "Exit Playthrough" }).click();
  await page.getByRole("button", { name: "Play Chapter" }).click();

  await expect(page.getByLabel("Case briefing").getByRole("heading", { name: "The Last Testimony" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Basement Log" })).not.toBeVisible();
});

test("the last testimony presents an image-backed courtroom visual novel scene", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Project").selectOption("the-last-testimony");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await revealOpeningChoices(page);
  await returnToCourtWithCrosscheck(page);

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
  await revealOpeningChoices(page);
  await returnToCourtWithCrosscheck(page);
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Advance testimony" }).click();
  await page.getByRole("button", { name: "Start cross-examination" }).click();
  await page.getByRole("button", { name: "Next statement" }).click();
  await page.getByRole("button", { name: "I left through the front doors before the alarm. I never went below the lobby." }).click();
  await page.getByRole("button", { name: "Elevator Keycard" }).click();
  await page.getByRole("button", { name: "Present Evidence" }).click();

  await expect(page.getByRole("heading", { name: "Witness Cracks" })).toBeVisible();
  await revealChoice(page, "Reveal the window contradiction");
  await page.getByRole("button", { name: "Reveal the window contradiction" }).click();

  await expect(page.getByRole("heading", { name: "Rain on the Inside" })).toBeVisible();
  await page.getByRole("button", { name: "Inspect the crime scene photo" }).click();
  await expect(page.getByRole("heading", { name: "Photo Inspection" })).toBeVisible();
  await expect(page.getByText("The Stain Beneath the Sill", { exact: true })).toBeVisible();
  await expect(page.getByText("Tap the narrow stain below the latch.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark the stain beneath the sill" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tap the rain reflection" })).toBeVisible();

  await page.getByRole("button", { name: "Mark the stain beneath the sill" }).click();
  await expect(page.getByRole("heading", { name: "Staged Window Path" })).toBeVisible();

  await revealChoice(page, "Build the closing argument");
  await page.getByRole("button", { name: "Build the closing argument" }).click();
  await expect(page.getByRole("heading", { name: "Photo Envelope Chain" })).toBeVisible();
  await expect(page.getByText("Ione Marr", { exact: true })).toBeVisible();
  await revealChoice(page, "Log the late photo envelope");
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
  await revealOpeningChoices(page);
  await returnToCourtWithCrosscheck(page);
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
