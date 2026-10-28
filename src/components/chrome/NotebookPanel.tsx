"use client";

import { NotebookIcon } from "@/components/icons";
import { SidePanel } from "./SidePanel";
import { TodoList } from "./TodoList";

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

export function NotebookPanel() {
  return (
    <SidePanel title="Today" icon={<NotebookIcon size={18} />}>
      <p className="mb-3 font-display text-ink-muted">{dateFmt.format(new Date())}</p>
      <TodoList autoFocus />
    </SidePanel>
  );
}
