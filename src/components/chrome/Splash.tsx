import { MilaMark } from "@/components/icons";

/** Shown while the room loads. Uses theme variables, so it is already in the user's theme. */
export function Splash() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-backdrop text-ink" role="status" aria-label="Loading your room">
      <div className="flex flex-col items-center gap-3">
        <MilaMark size={44} />
        <p className="font-display text-2xl tracking-wide">Mila</p>
        <p className="text-sm text-ink-muted">Lighting the lamp…</p>
      </div>
    </div>
  );
}
