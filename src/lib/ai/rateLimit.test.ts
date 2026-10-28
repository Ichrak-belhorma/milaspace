import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, per key", () => {
    const rl = createRateLimiter(2, 1000);
    expect(rl.take("a", 0)).toBe(0);
    expect(rl.take("a", 10)).toBe(0);
    expect(rl.take("a", 20)).toBe(980);
    expect(rl.take("b", 20)).toBe(0);
    expect(rl.take("a", 1001)).toBe(0);
  });
});
