import { expect, test } from "@playwright/test";
import { freshRoom, inDays, objectBar, SHOTS, studyRoom } from "./helpers";

test("module → outline → backward plan → today's tasks → flashcards", async ({ page }) => {
  await studyRoom(page);
  await objectBar(page).getByRole("button", { name: "Open the laptop to study" }).click();
  await expect(page.getByRole("heading", { name: "Study desk" })).toBeFocused();
  await page.getByRole("button", { name: "Add your first module" }).click();

  await page.getByLabel("Module name").fill("Cell Biology");
  await page.getByLabel(/Exam date/).fill(inDays(21));
  await page.getByLabel(/Course outline/).fill(
    "Chapter 1: Cells\n  - Membranes (30m)\n  - Organelles\nChapter 2: Genetics\n  - Mendel's laws\n  - DNA replication [1h]\nChapter 3: Evolution\n  - Natural selection",
  );
  await page.getByRole("button", { name: "Create module" }).click();

  await expect(page.getByRole("list", { name: "Curriculum" })).toBeVisible();
  await expect(page.getByLabel("Topic title").first()).toHaveValue("Chapter 1: Cells");
  await expect(page.getByText("Review buffer")).toBeVisible();
  await expect(page.getByText(/New material finishes/)).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/study-module.png` });

  await page.getByRole("tab", { name: "Today" }).click();
  const learn = page.getByRole("checkbox", { name: /^Learn: Membranes/ });
  await expect(learn).toBeVisible();
  await learn.check();
  await expect(page.getByText(/1 done/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/study-today.png` });

  // Done work reshapes the plan: Membranes now gets its spaced reviews instead of another lesson.
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page.getByText(/Review: Membranes/).first()).toBeVisible();

  await page.getByRole("tab", { name: "Flashcards" }).click();
  await page.getByLabel("Question").fill("What does the cell membrane control?");
  await page.getByLabel("Answer").fill("What enters and leaves the cell.");
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText("1 due")).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText("What enters and leaves the cell.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/flashcards-review.png` });
  await page.getByRole("group", { name: "How well did you remember?" }).getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText(/Done: 1 card reviewed/)).toBeVisible();

  // AI needs a server key; without one the buttons say so instead of failing.
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page.getByRole("button", { name: /Break down my syllabus/ })).toBeDisabled();

  // Everything persists locally.
  await page.reload();
  await page.waitForSelector("canvas");
  await objectBar(page).getByRole("button", { name: "Open the laptop to study" }).click();
  await page.getByRole("tab", { name: "Modules" }).click();
  await expect(page.getByRole("button", { name: /Cell Biology/ })).toBeVisible();
});

test("the notebook shows today's study plan", async ({ page }) => {
  await studyRoom(page);
  await objectBar(page).getByRole("button", { name: "Open the laptop to study" }).click();
  await page.getByRole("button", { name: "Add your first module" }).click();
  await page.getByLabel("Module name").fill("History");
  await page.getByLabel(/Course outline/).fill("1. Causes of the war\n2. Key dates");
  await page.getByRole("button", { name: "Create module" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Today" });
  await expect(panel.getByText("Study plan")).toBeVisible();
  await expect(panel.getByRole("checkbox", { name: /Learn: Causes of the war/ })).toBeVisible();
});

test("account panel offers sign-in (cloud sync is optional)", async ({ page }) => {
  await freshRoom(page);
  await page.getByRole("button", { name: /Account/ }).click();
  const panel = page.getByRole("complementary", { name: "Account" });
  await expect(panel.getByLabel("Email")).toBeVisible();
  await expect(panel.getByLabel("Password")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Email me a sign-in link instead" })).toBeDisabled();
});

test("AI routes validate input and require sign-in", async ({ request }) => {
  expect(await (await request.get("/api/ai/status")).json()).toEqual({ enabled: false });
  const bad = await request.post("/api/ai/curriculum", { data: { moduleName: "" } });
  expect(bad.status()).toBe(400);
  const anon = await request.post("/api/ai/curriculum", { data: { moduleName: "Bio", syllabusText: "Cells and genetics" } });
  expect(anon.status()).toBe(401);
  expect((await anon.json()).error).toBe("unauthorized");
  const notJson = await request.post("/api/ai/flashcards", { headers: { "content-type": "application/json" }, data: "nope" });
  expect(notJson.status()).toBe(400);
});
