import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createModule, objectBar, SHOTS, studyRoom } from "./helpers";

test("schedule: one daily budget and a weekly free-time grid", async ({ page }) => {
  await studyRoom(page);
  await createModule(page, "Statistics", "Chapter 1: Probability\n  - Events\n  - Bayes' rule", 30);
  await page.getByRole("tab", { name: "Schedule" }).click();
  await expect(page.getByRole("slider", { name: "Across all modules" })).toBeVisible();
  const grid = page.getByRole("table", { name: "Weekly free time" });
  const slot = grid.getByRole("button", { name: "Mon 09:00–09:30 free" });
  await slot.click();
  await expect(grid.getByRole("button", { name: "Mon 09:00–09:30 busy" })).toBeVisible();
  await page.getByRole("button", { name: "Typical student week" }).click();
  await expect(grid.getByRole("button", { name: "Mon 17:00–17:30 free" })).toBeVisible();
  await expect(grid.getByRole("button", { name: "Mon 09:00–09:30 busy" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/schedule.png` });
});

test("a task's focus run ends with a check-in; stuck adds help for tomorrow", async ({ page }) => {
  await studyRoom(page);
  await createModule(page, "Chemistry", "Chapter 1: Atoms\n  - Electron shells\n  - Bonds", 21);
  await page.getByRole("tab", { name: "Today" }).click();
  await page.getByRole("button", { name: /^Focus on Learn: Electron shells/ }).click();
  const timer = page.getByRole("region", { name: "Focus timer" });
  await expect(timer).toContainText("On: Learn: Electron shells");
  await timer.getByRole("button", { name: "Skip to next phase" }).click();

  const checkIn = page.getByRole("region", { name: "How did it go?" });
  await expect(checkIn).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/check-in.png` });
  await checkIn.getByRole("button", { name: "I’m stuck" }).click();
  await expect(checkIn).toBeHidden();
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page.getByText(/Revisit Electron shells/).first()).toBeVisible();
});

test("just start: a 5-minute run, then keep going", async ({ page }) => {
  await studyRoom(page);
  const timer = page.getByRole("region", { name: "Focus timer" });
  await timer.getByRole("button", { name: "Just start: 5 minutes" }).click();
  await expect(timer.getByRole("timer")).toHaveAccessibleName("05:00 remaining");
  await expect(timer).toContainText("Just 5 minutes");
  await timer.getByRole("button", { name: "Skip to next phase" }).click();
  const checkIn = page.getByRole("region", { name: "How did it go?" });
  await expect(checkIn).toContainText("Five minutes done. You started!");
  await checkIn.getByRole("button", { name: "Keep going" }).click();
  await expect(checkIn).toBeHidden();
  await expect(timer.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("wall calendar zooms in, picks a day and exports .ics", async ({ page }) => {
  await studyRoom(page);
  await createModule(page, "Physics", "Chapter 1: Motion\n  - Velocity\n  - Acceleration", 14);
  await page.keyboard.press("Escape");
  await objectBar(page).getByRole("button", { name: "Look at the calendar" }).click();
  const controls = page.getByRole("region", { name: "Calendar", exact: true });
  await expect(controls.getByRole("button", { name: "Next month" })).toBeVisible();
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/calendar.png` });

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /\.ics/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("mila-study-plan.ics");
  const ics = readFileSync((await file.path())!, "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("Learn: Velocity");
  expect(ics).toMatch(/Exam: Physics/);
});

test("study buddy works at the window desk and starts a session with you", async ({ page }) => {
  await studyRoom(page);
  await objectBar(page).getByRole("button", { name: "Your study buddy" }).click();
  await page.getByRole("button", { name: "Start together (5 minutes)" }).click();
  await expect(page.getByRole("region", { name: "Focus timer" })).toContainText("Just 5 minutes");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/buddy.png` });
});
