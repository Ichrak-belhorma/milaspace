import type { OutlineNode } from "./outline";
import type { Unit } from "./scheduler";
import type { CurriculumNode } from "./types";

export type TreeNode = CurriculumNode & { children: TreeNode[] };

/** Nest a module's flat nodes, siblings ordered by position. */
export function buildTree(nodes: CurriculumNode[], moduleId: string): TreeNode[] {
  const own = nodes.filter((n) => n.moduleId === moduleId);
  const byParent = new Map<string | null, CurriculumNode[]>();
  for (const n of own) {
    const key = own.some((p) => p.id === n.parentId) ? n.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), n]);
  }
  const build = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? []).sort((a, b) => a.position - b.position).map((n) => ({ ...n, children: build(n.id) }));
  return build(null);
}

/** Leaves in study order (depth-first): the units the planner schedules. */
export function leafUnits(nodes: CurriculumNode[], moduleId: string): Unit[] {
  const out: Unit[] = [];
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.children.length) walk(n.children);
      else out.push({ nodeId: n.id, title: n.title, contentType: n.contentType, estMinutes: n.estMinutes, mastery: n.mastery });
    }
  };
  walk(buildTree(nodes, moduleId));
  return out;
}

/** Descendants of a node (for cascading deletes). */
export function descendantIds(nodes: CurriculumNode[], id: string): string[] {
  const kids = nodes.filter((n) => n.parentId === id).map((n) => n.id);
  return kids.flatMap((k) => [k, ...descendantIds(nodes, k)]);
}

/** Convert a parsed outline into stored nodes under a module. */
export function outlineToNodes(outline: OutlineNode[], moduleId: string, makeId: () => string, now: number, startPosition = 0): CurriculumNode[] {
  const out: CurriculumNode[] = [];
  const walk = (list: OutlineNode[], parentId: string | null, offset: number) =>
    list.forEach((o, i) => {
      const id = makeId();
      out.push({ id, moduleId, parentId, kind: o.kind, title: o.title, position: offset + i, contentType: o.contentType, estMinutes: o.estMinutes, mastery: 0, updatedAt: now });
      walk(o.children, id, 0);
    });
  walk(outline, null, startPosition);
  return out;
}
