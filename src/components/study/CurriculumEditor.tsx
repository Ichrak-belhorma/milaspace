"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useStudyStore } from "@/stores/study";
import { buildTree, type TreeNode } from "@/study/tree";
import { CONTENT_TYPES, type ContentType } from "@/study/types";

function NodeRow({ node, depth, index, count }: { node: TreeNode; depth: number; index: number; count: number }) {
  const { updateNode, moveNode, deleteNode, addNode } = useStudyStore.getState();
  const [title, setTitle] = useState(node.title);
  const leaf = node.children.length === 0;
  return (
    <li>
      <div className="group flex flex-wrap items-center gap-1.5 rounded-glass-sm py-1 hover:bg-ink/5" style={{ paddingLeft: `${depth * 1.1}rem` }}>
        <span aria-hidden className="w-2 text-ink-muted">
          {leaf ? "·" : "▾"}
        </span>
        <label className="sr-only" htmlFor={`node-${node.id}`}>
          Topic title
        </label>
        <input
          id={`node-${node.id}`}
          className="field min-w-32 flex-1 py-1 text-sm"
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== node.title && updateNode(node.id, { title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {leaf && (
          <>
            <label className="sr-only" htmlFor={`type-${node.id}`}>
              Content type
            </label>
            <select id={`type-${node.id}`} className="field w-auto py-1 text-xs" value={node.contentType} onChange={(e) => updateNode(node.id, { contentType: e.target.value as ContentType })}>
              {CONTENT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor={`min-${node.id}`}>
              Minutes to learn
            </label>
            <input
              id={`min-${node.id}`}
              type="number"
              min={5}
              max={600}
              step={5}
              className="field w-16 py-1 text-xs"
              value={node.estMinutes}
              onChange={(e) => updateNode(node.id, { estMinutes: Math.max(5, Math.min(600, Number(e.target.value) || 5)) })}
            />
            <span className="text-xs text-ink-muted" title="Mastery">
              {Math.round(node.mastery * 100)}%
            </span>
          </>
        )}
        <span className="flex gap-0.5">
          <button type="button" className="btn btn-icon min-h-7 min-w-7 p-1 text-xs" onClick={() => moveNode(node.id, -1)} disabled={index === 0} aria-label={`Move ${node.title} up`}>
            ↑
          </button>
          <button type="button" className="btn btn-icon min-h-7 min-w-7 p-1 text-xs" onClick={() => moveNode(node.id, 1)} disabled={index === count - 1} aria-label={`Move ${node.title} down`}>
            ↓
          </button>
          {node.kind !== "skill" && (
            <button type="button" className="btn btn-icon min-h-7 min-w-7 p-1" onClick={() => addNode(node.moduleId, node.id, "New topic")} aria-label={`Add a subtopic under ${node.title}`}>
              <PlusIcon size={14} />
            </button>
          )}
          <button type="button" className="btn btn-icon min-h-7 min-w-7 p-1" onClick={() => deleteNode(node.id)} aria-label={`Delete ${node.title}`}>
            <TrashIcon size={14} />
          </button>
        </span>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c, i) => (
            <NodeRow key={c.id} node={c} depth={depth + 1} index={i} count={node.children.length} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The course as an editable tree: chapters → concepts → skills. Leaves are what gets scheduled. */
export function CurriculumEditor({ moduleId }: { moduleId: string }) {
  const nodes = useStudyStore((s) => s.nodes);
  const addNode = useStudyStore((s) => s.addNode);
  const tree = buildTree(nodes, moduleId);
  return (
    <div className="flex flex-col gap-2">
      {tree.length === 0 ? (
        <p className="text-sm text-ink-muted">No topics yet. Paste an outline below, or add chapters one by one.</p>
      ) : (
        <ul aria-label="Curriculum">
          {tree.map((n, i) => (
            <NodeRow key={n.id} node={n} depth={0} index={i} count={tree.length} />
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-soft self-start text-sm" onClick={() => addNode(moduleId, null, "New chapter")}>
        <PlusIcon size={16} /> Add chapter
      </button>
    </div>
  );
}
