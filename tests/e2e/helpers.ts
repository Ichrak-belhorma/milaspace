import { deflateSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";

export const SHOTS = "tests/e2e/__screenshots__";

export async function openRoom(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.waitForSelector("canvas");
  await page.waitForTimeout(2500);
}

export async function freshRoom(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await openRoom(page);
}

export function objectBar(page: Page) {
  return page.getByRole("navigation", { name: "Room objects" });
}

/** A small gradient PNG, generated so the tests need no fixture files. */
export function gradientPng(width = 96, height = 128): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round((x / width) * 255);
      raw[o + 1] = 120;
      raw[o + 2] = Math.round((y / height) * 255);
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/**
 * A fresh room whose clock reads 09:00 today and whose whole week is free, so the planner always has
 * room for today's blocks whatever time the suite runs.
 */
export async function studyRoom(page: Page) {
  const nine = new Date();
  nine.setHours(9, 0, 0, 0);
  await page.clock.setFixedTime(nine);
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    const free = Array.from({ length: 7 }, () => "1".repeat(48));
    localStorage.setItem("mila:schedule", JSON.stringify({ state: { dailyBudget: 120, availability: free, pace: { factor: 1, samples: 0 }, updatedAt: 1 }, version: 1 }));
  });
  await openRoom(page);
}

export function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function createModule(page: Page, name: string, outline: string, examInDays?: number) {
  await objectBar(page).getByRole("button", { name: "Open the laptop to study" }).click();
  await page.getByRole("button", { name: "Add your first module" }).click();
  await page.getByLabel("Module name").fill(name);
  if (examInDays) await page.getByLabel(/Exam date/).fill(inDays(examInDays));
  await page.getByLabel(/Course outline/).fill(outline);
  await page.getByRole("button", { name: "Create module" }).click();
  await expect(page.getByRole("list", { name: "Curriculum" })).toBeVisible();
}
