"use client";

import { chooseDrink } from "@/stores/actions";
import { DRINKS, DRINK_IDS, useRoomStore } from "@/stores/room";

/** Choose what to drink. Each one gets its own cup, color and (if hot) steam. */
export function DrinkPicker() {
  const current = useRoomStore((s) => s.drink.kind);
  return (
    <div role="group" aria-label="Choose a drink" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DRINK_IDS.map((id) => (
        <button key={id} type="button" className="btn btn-soft justify-start gap-2 text-sm" data-active={current === id} onClick={() => chooseDrink(id)}>
          {/* Swatch of the drink itself; a physical color, not a theme color. */}
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/30" style={{ background: DRINKS[id].liquid }} />
          {DRINKS[id].label}
        </button>
      ))}
    </div>
  );
}
