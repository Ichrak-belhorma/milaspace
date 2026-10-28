import { describe, expect, it } from "vitest";
import { toCurriculum, toFlashcards } from "./normalize";

describe("toCurriculum", () => {
  it("builds a valid tree, clamping estimates and dropping blank titles", () => {
    const r = toCurriculum({
      chapters: [
        {
          title: "  Limits  ",
          contentType: "math",
          concepts: [
            { title: "Definition", contentType: "conceptual", estMinutes: 2, skills: [] },
            { title: "Rules", contentType: "math", estMinutes: 60, skills: [{ title: "Product rule", contentType: "math", estMinutes: 1000 }, { title: " ", contentType: "math", estMinutes: 20 }] },
          ],
        },
        { title: "", contentType: "memorize", concepts: [] },
      ],
    });
    expect(r.success).toBe(true);
    const ch = r.data!.chapters;
    expect(ch).toHaveLength(1);
    expect(ch[0]!.title).toBe("Limits");
    expect(ch[0]!.children[0]!.estMinutes).toBe(5);
    expect(ch[0]!.children[1]!.children).toHaveLength(1);
    expect(ch[0]!.children[1]!.children[0]!.estMinutes).toBe(600);
    expect(ch[0]!.estMinutes).toBe(600);
  });

  it("fails when nothing usable came back", () => {
    expect(toCurriculum({ chapters: [] }).success).toBe(false);
  });
});

describe("toFlashcards", () => {
  it("trims, de-duplicates and caps", () => {
    const r = toFlashcards(
      {
        cards: [
          { front: "What is a limit?", back: "The value f approaches." },
          { front: "what is a limit?", back: "dup" },
          { front: "", back: "x" },
          { front: "Q2", back: "A2" },
          { front: "Q3", back: "A3" },
        ],
      },
      2,
    );
    expect(r.success).toBe(true);
    expect(r.data!.cards.map((c) => c.front)).toEqual(["What is a limit?", "Q2"]);
  });
});
