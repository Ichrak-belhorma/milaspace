import { describe, expect, it } from "vitest";
import { parseOutline } from "./outline";
import { buildTree, descendantIds, leafUnits, outlineToNodes } from "./tree";

describe("curriculum tree", () => {
  let n = 0;
  const nodes = outlineToNodes(parseOutline("Ch 1\n  - A\n  - B\nCh 2\n  - C\n    - C1\n    - C2"), "m", () => `n${++n}`, 0);

  it("nests nodes and keeps sibling order", () => {
    const tree = buildTree(nodes, "m");
    expect(tree.map((t) => t.title)).toEqual(["Ch 1", "Ch 2"]);
    expect(tree[1]!.children[0]!.children.map((t) => t.title)).toEqual(["C1", "C2"]);
  });

  it("lists leaves depth-first as units", () => {
    expect(leafUnits(nodes, "m").map((u) => u.title)).toEqual(["A", "B", "C1", "C2"]);
  });

  it("finds descendants for cascading deletes", () => {
    const ch2 = nodes.find((x) => x.title === "Ch 2")!;
    expect(descendantIds(nodes, ch2.id).map((id) => nodes.find((x) => x.id === id)!.title)).toEqual(["C", "C1", "C2"]);
  });
});
