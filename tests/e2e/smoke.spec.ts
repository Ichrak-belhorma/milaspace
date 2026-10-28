import { expect, test, type Page } from "@playwright/test";

const SHOTS = "tests/e2e/__screenshots__";
// Warnings from three.js / R3F internals that are not ours to fix.
const IGNORED = [/THREE\.Clock/, /PCFSoftShadowMap/, /GPU stall/, /WebGL/i];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !IGNORED.some((r) => r.test(m.text()))) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function openRoom(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.waitForSelector("canvas");
  await page.waitForTimeout(2500);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("room loads with glass UI and no console errors", async ({ page }) => {
  const errors = trackErrors(page);
  await openRoom(page);
  await expect(page.getByRole("region", { name: "Focus timer" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Room objects" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/room-default.png` });
  expect(errors).toEqual([]);
});

test("every preset applies its tokens and passes a visual check", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("button", { name: "Theme" }).click();
  const panel = page.getByRole("complementary", { name: "Theme" });
  const accents = new Set<string>();
  for (const name of ["Gothic Glass", "Frutiger Aero", "Cottagecore", "Minimal Calm"]) {
    await panel.getByRole("button", { name }).click();
    await page.waitForTimeout(1200);
    accents.add(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mila-accent").trim()));
    await expect(panel.getByRole("status").first()).toContainText("Readable");
    await page.screenshot({ path: `${SHOTS}/preset-${name.toLowerCase().replace(/ /g, "-")}.png` });
  }
  expect(accents.size).toBe(4);
});

test("theme edits preview live, save, and survive a reload", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("button", { name: "Theme" }).click();
  const panel = page.getByRole("complementary", { name: "Theme" });
  await panel.locator("summary", { hasText: "Glass" }).click();
  const opacity = panel.getByRole("slider", { name: "Opacity" });
  await opacity.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  const value = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mila-glass-opacity").trim());
  expect(Number(value)).toBeGreaterThan(0.62);
  await panel.getByLabel("Theme name").fill("Midnight study");
  await panel.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel.getByText('Saved "Midnight study".')).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Theme" }).click();
  await expect(page.getByRole("button", { name: "Midnight study", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("theme import rejects bad JSON and accepts an exported theme", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("button", { name: "Theme" }).click();
  const panel = page.getByRole("complementary", { name: "Theme" });
  await panel.getByRole("button", { name: "Paste JSON" }).click();
  await panel.getByLabel("Theme JSON").fill("{not json");
  await panel.getByRole("button", { name: "Import pasted theme" }).click();
  await expect(panel.getByRole("alert")).toContainText("isn't valid JSON");

  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export" }).click();
  const file = await download;
  const json = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8"));
  await panel.getByLabel("Theme JSON").fill(json.replace('"Gothic Glass"', '"Shared Goth"'));
  await panel.getByRole("button", { name: "Import pasted theme" }).click();
  await expect(panel.getByText('Imported "Shared Goth".')).toBeVisible();
});

test("room objects work from the keyboard object bar", async ({ page }) => {
  await openRoom(page);
  const bar = page.getByRole("navigation", { name: "Room objects" });

  const lamp = bar.getByRole("button", { name: /lamp/ });
  await expect(lamp).toHaveAttribute("aria-pressed", "true");
  await lamp.click();
  await expect(lamp).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("region", { name: "Desk lamp" })).toBeVisible();
  await page.getByRole("switch", { name: "Lamp" }).click();
  await expect(lamp).toHaveAttribute("aria-pressed", "true");

  await bar.getByRole("button", { name: "Open the window" }).click();
  const win = page.getByRole("region", { name: "Window" });
  await win.getByRole("radio", { name: "Snow" }).click();
  await expect(win.getByRole("radio", { name: "Snow" })).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/window-snow-open.png` });
  await win.getByRole("radio", { name: "Sunset" }).click();
  await page.keyboard.press("Escape");
  await expect(win).toBeHidden();

  await bar.getByRole("button", { name: "Bring a coffee" }).click();
  await expect(bar.getByRole("button", { name: "Take a sip" })).toBeVisible();
  await bar.getByRole("button", { name: "Spin the fidget spinner" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/coffee-sunset.png` });

  await bar.getByRole("button", { name: "Open the drawer" }).click();
  const drawer = page.getByRole("region", { name: "Drawer" });
  await expect(drawer.getByRole("button", { name: "Flashcards" })).toBeVisible();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/drawer-peek.png` });
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(bar.getByRole("button", { name: "Open the drawer" })).toBeVisible();

  await bar.getByRole("button", { name: "Open the laptop to study" }).click();
  await expect(page.getByRole("heading", { name: "Study desk" })).toBeFocused();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/laptop-study-view.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Study desk" })).toBeHidden();
});

test("timer starts, pauses and keeps running across a reload", async ({ page }) => {
  await openRoom(page);
  const timer = page.getByRole("region", { name: "Focus timer" });
  await timer.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(2200);
  const clock = timer.getByRole("timer");
  await expect(clock).not.toHaveText("25:00");
  await page.reload();
  await expect(page.getByRole("region", { name: "Focus timer" }).getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("region", { name: "Focus timer" }).getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("region", { name: "Focus timer" }).getByRole("button", { name: "Resume" })).toBeVisible();
});

test("notebook to-dos persist and the timer stays visible while panels are open", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  const input = page.getByLabel("New to-do");
  await expect(input).toBeFocused();
  await input.fill("Read chapter 3 intro");
  await page.keyboard.press("Enter");
  await page.getByLabel("New to-do").fill("Make 10 flashcards");
  await page.keyboard.press("Enter");
  await page.getByRole("checkbox", { name: "Read chapter 3 intro" }).check();
  await expect(page.getByText("1 of 2 done")).toBeVisible();
  await expect(page.getByRole("region", { name: "Focus timer" })).toBeInViewport();
  await page.screenshot({ path: `${SHOTS}/notebook-panel.png` });
  await page.reload();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Read chapter 3 intro" })).toBeChecked();
});

test("ambience panel controls layers and music", async ({ page }) => {
  await openRoom(page);
  await page.getByRole("button", { name: "Ambience" }).click();
  const panel = page.getByRole("complementary", { name: "Ambience" });
  const rain = panel.getByRole("slider", { name: "Rain", exact: true });
  await rain.focus();
  await page.keyboard.press("End");
  await expect(rain).toHaveAttribute("aria-valuetext", "100%");
  await panel.getByRole("button", { name: "Play music" }).click();
  await expect(panel.getByRole("button", { name: "Pause music" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/ambience-panel.png` });
});

test("reduced motion is respected", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = trackErrors(page);
  await openRoom(page);
  await page.getByRole("navigation", { name: "Room objects" }).getByRole("button", { name: "Open the laptop to study" }).click();
  await expect(page.getByRole("heading", { name: "Study desk" })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test("mobile layout keeps timer and objects reachable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openRoom(page);
  await expect(page.getByRole("region", { name: "Focus timer" })).toBeInViewport();
  await expect(page.getByRole("navigation", { name: "Room objects" })).toBeInViewport();
  await page.screenshot({ path: `${SHOTS}/mobile.png` });
  await context.close();
});
