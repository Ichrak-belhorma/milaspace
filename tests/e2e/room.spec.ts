import { expect, test } from "@playwright/test";
import { freshRoom, gradientPng, objectBar, SHOTS } from "./helpers";

test("sit at the desk, look closely at things, stand up", async ({ page }) => {
  await freshRoom(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByLabel("New to-do").fill("Read chapter 3 intro");
  await page.keyboard.press("Enter");
  await page.getByLabel("New to-do").fill("Make 10 flashcards");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");

  const bar = objectBar(page);
  await bar.getByRole("button", { name: "Sit at the desk" }).click();
  const pose = page.getByRole("region", { name: "Where you are" });
  await expect(pose).toContainText("At your desk");
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/seated.png` });

  await bar.getByRole("button", { name: "Spin the fidget spinner" }).click();
  await expect(pose).toContainText("Looking at the fidget spinner");
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/closeup-fidget.png` });

  await bar.getByRole("button", { name: "Open today's notebook" }).click();
  await expect(pose).toContainText("Looking at the notebook");
  await page.keyboard.press("Escape"); // closes the notebook panel, keeps the close-up
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/closeup-notebook.png` });

  await pose.getByRole("button", { name: "Back" }).click();
  await expect(pose).toContainText("At your desk");
  await pose.getByRole("button", { name: "Stand up" }).click();
  await expect(pose).toBeHidden();
});

test("get into bed, look around, sleep with eyelids and ZZZs, wake up", async ({ page }) => {
  await freshRoom(page);
  await objectBar(page).getByRole("button", { name: "Get into bed" }).click();
  const bed = page.getByRole("region", { name: "In bed" });
  await expect(bed).toBeVisible();
  await page.mouse.move(720, 420, { steps: 4 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/bed-view.png` });
  await page.mouse.move(1350, 560, { steps: 8 }); // turn right, toward the nightstand
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${SHOTS}/bed-look-right.png` });

  await bed.getByRole("radio", { name: "10 min" }).click();
  await bed.getByRole("button", { name: "Close my eyes" }).click();
  await expect(page.locator(".sleep[data-closed]")).toHaveCount(1);
  await expect(page.locator(".sleep__zzz span")).toHaveCount(3);
  const sleeping = page.getByRole("region", { name: "Sleeping" });
  await expect(sleeping).toContainText("Alarm in");
  await page.mouse.move(900, 380, { steps: 8 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/sleeping.png` });

  await sleeping.getByRole("button", { name: "Wake up" }).click();
  await expect(page.locator(".sleep[data-closed]")).toHaveCount(0);
  await page.getByRole("region", { name: "Where you are" }).getByRole("button", { name: "Get up" }).click();
  await expect(page.getByRole("region", { name: "Where you are" })).toBeHidden();
});

test("phone on the nightstand: check it and flip it face-down", async ({ page }) => {
  await freshRoom(page);
  await objectBar(page).getByRole("button", { name: "Check your phone" }).click();
  const phone = page.getByRole("region", { name: "Phone" });
  await expect(phone.getByRole("button", { name: "Play music" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/phone.png` });
  await phone.getByRole("switch", { name: /Flip face-down/ }).click();
  await expect(phone).toContainText("face-down");
});

test("curtains close and the painting takes your own picture", async ({ page }) => {
  await freshRoom(page);
  const bar = objectBar(page);
  await bar.getByRole("button", { name: "Draw the curtains" }).click();
  await expect(bar.getByRole("button", { name: "Open the curtains" })).toHaveAttribute("aria-pressed", "true");

  await bar.getByRole("button", { name: "Change the painting" }).click();
  const painting = page.getByRole("region", { name: "Painting" });
  await painting.getByLabel("Choose a picture").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: gradientPng() });
  // Image encoding is slow when WebGL runs on the CPU (headless CI); instant on a real GPU.
  await expect(painting.getByRole("status")).toHaveText("Hung on the wall.", { timeout: 20_000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/curtains-painting.png` });

  // The picture survives a reload (IndexedDB).
  await page.reload();
  await page.waitForSelector("canvas");
  await objectBar(page).getByRole("button", { name: "Change the painting" }).click();
  await expect(page.getByRole("region", { name: "Painting" }).getByRole("button", { name: "Original print" })).toBeEnabled();
});
