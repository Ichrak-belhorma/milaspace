import { defaultMinutes, type ContentType, type NodeKind } from "./types";

/**
 * Turn a pasted course outline into a curriculum tree, without AI. Understands indentation,
 * markdown headings, bullets and numbering ("1.", "1.2.3", "a)", "IV."), and "Chapter 3: …" lines.
 * An optional time hint like "(45m)", "[1.5h]" or "~2h" sets the estimate.
 */
export type OutlineNode = {
  title: string;
  kind: NodeKind;
  contentType: ContentType;
  estMinutes: number;
  children: OutlineNode[];
};

// Bullets and list markers. Plain numbers need a "." or ")" so titles like "2024 elections" survive.
const BULLET = /^([-*•+▪◦‣]|\(?[a-z]\)|\(?[ivxlc]+[.)]|\d+[.)]|\d+(\.\d+)+\.?)\s+/i;
const TIME_HINT = /\s*(?:[([~]\s*)?(\d+(?:[.,]\d+)?)\s*(m|min|mins|minutes|h|hr|hrs|hours)\s*[)\]]?\s*$/i;

const KEYWORDS: [ContentType, RegExp][] = [
  ["coding", /\b(?:code|coding|programs?|programming|algorithms?|functions?|python|java(?:script)?|typescript|sql|c\+\+|recursion|data structures?|apis?|class(?:es)?|debugging)\b/i],
  ["math", /\b(?:equations?|integrals?|integration|derivatives?|differential|calculus|algebra|matri(?:x|ces)|vectors?|theorems?|proofs?|probability|statistics|limits?|series|geometry|trigonometry|linear|logarithms?|polynomials?|chain rule)\b/i],
  ["memorize", /\b(?:vocabulary|vocab|terms?|definitions?|dates?|names|anatomy|glossary|formulas?|conjugations?|kanji|flashcards?|memori[sz]e|list of)\b/i],
];

export function guessContentType(title: string): ContentType {
  return KEYWORDS.find(([, re]) => re.test(title))?.[0] ?? "conceptual";
}

type Line = { depth: number; title: string; minutes: number | null };

function parseLine(raw: string): Line | null {
  if (!raw.trim()) return null;
  const indent = raw.match(/^[\t ]*/)![0].replace(/\t/g, "    ").length;
  let text = raw.trim();
  let depth = Math.floor(indent / 2);

  const heading = text.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    depth = heading[1]!.length - 1;
    text = heading[2]!.replace(BULLET, "");
  } else {
    // "1.2.3 Title" → depth from the numbering.
    const dotted = text.match(/^(\d+(?:\.\d+)+)\.?\s+/);
    if (dotted) depth = Math.max(depth, dotted[1]!.split(".").length - 1);
    text = text.replace(BULLET, "");
  }
  if (/^(chapter|unit|part|module|week|section)\b/i.test(text)) depth = Math.min(depth, 0);

  let minutes: number | null = null;
  const hint = text.match(TIME_HINT);
  if (hint) {
    const n = Number(hint[1]!.replace(",", "."));
    minutes = Math.round(/^h/i.test(hint[2]!) ? n * 60 : n);
    text = text.slice(0, hint.index).trim();
  }
  text = text.replace(/[:\s]+$/, "").trim();
  if (!text) return null;
  return { depth, title: text.slice(0, 160), minutes };
}

const KINDS: NodeKind[] = ["chapter", "concept", "skill"];

export function parseOutline(text: string): OutlineNode[] {
  const lines = text.split(/\r?\n/).map(parseLine).filter((l): l is Line => l !== null);
  if (lines.length === 0) return [];
  // Normalize depths so the shallowest line is a chapter and gaps collapse (0, 2, 4 → 0, 1, 2).
  const levels = [...new Set(lines.map((l) => l.depth))].sort((a, b) => a - b);
  const roots: OutlineNode[] = [];
  const stack: { depth: number; node: OutlineNode }[] = [];

  for (const line of lines) {
    let depth = levels.indexOf(line.depth);
    // A child can be at most one level deeper than its parent.
    const parentDepth = stack.length ? stack[stack.length - 1]!.depth : -1;
    depth = Math.min(depth, parentDepth + 1);
    while (stack.length && stack[stack.length - 1]!.depth >= depth) stack.pop();
    const contentType = guessContentType(line.title);
    const node: OutlineNode = {
      title: line.title,
      kind: KINDS[Math.min(depth, 2)]!,
      contentType,
      estMinutes: line.minutes ?? defaultMinutes(contentType),
      children: [],
    };
    const parent = stack[stack.length - 1];
    if (parent) parent.node.children.push(node);
    else roots.push(node);
    stack.push({ depth, node });
  }
  return roots;
}

/** Leaves are the units you actually learn; chapters with children are just containers. */
export function countLeaves(nodes: OutlineNode[]): number {
  return nodes.reduce((n, node) => n + (node.children.length ? countLeaves(node.children) : 1), 0);
}
