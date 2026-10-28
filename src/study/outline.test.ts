import { describe, expect, it } from "vitest";
import { countLeaves, guessContentType, parseOutline } from "./outline";

describe("outline parser", () => {
  it("builds a tree from indentation and bullets", () => {
    const tree = parseOutline(`Cell biology
  - Membranes
    - Diffusion and osmosis (30m)
  - Organelles
Genetics
  - Mendel's laws [1.5h]`);
    expect(tree.map((n) => n.title)).toEqual(["Cell biology", "Genetics"]);
    expect(tree[0]!.kind).toBe("chapter");
    expect(tree[0]!.children.map((n) => n.title)).toEqual(["Membranes", "Organelles"]);
    expect(tree[0]!.children[0]!.children[0]).toMatchObject({ title: "Diffusion and osmosis", kind: "skill", estMinutes: 30 });
    expect(tree[1]!.children[0]).toMatchObject({ title: "Mendel's laws", estMinutes: 90 });
    expect(countLeaves(tree)).toBe(3);
  });

  it("understands markdown headings and dotted numbering", () => {
    const tree = parseOutline(`# Calculus
## 1.1 Limits
## 1.2 Derivatives
1.2.1 Chain rule`);
    expect(tree[0]!.children.map((n) => n.title)).toEqual(["Limits", "Derivatives"]);
    expect(tree[0]!.children[1]!.children[0]!.title).toBe("Chain rule");
  });

  it("treats a flat list as units", () => {
    const tree = parseOutline("1. Photosynthesis\n2. Respiration\n3) Enzymes");
    expect(tree.map((n) => n.title)).toEqual(["Photosynthesis", "Respiration", "Enzymes"]);
    expect(countLeaves(tree)).toBe(3);
  });

  it("keeps titles that start with a year", () => {
    expect(parseOutline("2024 elections")[0]!.title).toBe("2024 elections");
  });

  it("guesses content types", () => {
    expect(guessContentType("Integrals and the chain rule")).toBe("math");
    expect(guessContentType("Recursion in Python")).toBe("coding");
    expect(guessContentType("Key dates of the French Revolution")).toBe("memorize");
    expect(guessContentType("Causes of the First World War")).toBe("conceptual");
  });

  it("ignores blank input", () => {
    expect(parseOutline("\n  \n")).toEqual([]);
  });
});
