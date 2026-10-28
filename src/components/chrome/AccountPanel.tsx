"use client";

import { useId, useState } from "react";
import { Segmented } from "@/components/glass/controls";
import { UserIcon } from "@/components/icons";
import { clearPersonalData, fullSync } from "@/lib/sync/engine";
import { getSupabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { SidePanel } from "./SidePanel";

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function SignInForm() {
  const id = useId();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const redirect = () => `${window.location.origin}/auth/callback`;

  const submit = async () => {
    const db = getSupabase();
    if (!db) return;
    setBusy(true);
    setMessage(null);
    const res =
      mode === "sign-in"
        ? await db.auth.signInWithPassword({ email, password })
        : await db.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } });
    setBusy(false);
    if (res.error) setMessage({ kind: "error", text: res.error.message });
    else if (mode === "sign-up" && !res.data.session) setMessage({ kind: "ok", text: "Check your email to confirm your account, then come back here." });
  };

  const magicLink = async () => {
    const db = getSupabase();
    if (!db || !email) return;
    setBusy(true);
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
    setBusy(false);
    setMessage(error ? { kind: "error", text: error.message } : { kind: "ok", text: `We emailed a sign-in link to ${email}.` });
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Segmented
        label="Account"
        value={mode}
        options={[
          { value: "sign-in", label: "Sign in" },
          { value: "sign-up", label: "Create account" },
        ]}
        onChange={setMode}
      />
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-email`}>
        Email
        <input id={`${id}-email`} type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-password`}>
        Password
        <input
          id={`${id}-password`}
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-accent" disabled={busy}>
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
      <button type="button" className="btn btn-soft text-sm" disabled={busy || !email} onClick={() => void magicLink()}>
        Email me a sign-in link instead
      </button>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="text-sm">
          {message.text}
        </p>
      )}
      <p className="text-xs text-ink-muted">
        Everything you&rsquo;ve made so far stays on this device until you sign in, then it moves into your account and syncs across devices.
      </p>
    </form>
  );
}

function SyncStatus() {
  const sync = useAuthStore((s) => s.sync);
  const text =
    sync.state === "syncing"
      ? "Syncing…"
      : sync.state === "setup-needed" || sync.state === "error"
        ? sync.message
        : sync.lastSyncedAt
          ? `Synced at ${timeFmt.format(sync.lastSyncedAt)}`
          : "Not synced yet";
  return (
    <p role="status" className={`well px-3 py-2 text-sm ${sync.state === "error" || sync.state === "setup-needed" ? "font-semibold" : ""}`}>
      {text}
    </p>
  );
}

/** Sign in to sync your room, plan and progress across devices. Optional: Mila works fully signed out. */
export function AccountPanel() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const syncing = useAuthStore((s) => s.sync.state === "syncing");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <SidePanel title="Account" icon={<UserIcon size={18} />}>
      {status === "unconfigured" ? (
        <p className="text-sm text-ink-muted">Cloud sync isn&rsquo;t configured in this build. Everything is saved on this device.</p>
      ) : status === "loading" ? (
        <p className="text-sm text-ink-muted">Checking your session…</p>
      ) : !user ? (
        <SignInForm />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Signed in as <span className="font-semibold">{user.email}</span>
          </p>
          <SyncStatus />
          <button type="button" className="btn btn-soft text-sm" onClick={() => void fullSync()} disabled={syncing}>
            Sync now
          </button>
          {confirmingSignOut ? (
            <div className="well flex flex-col gap-2 p-3 text-sm">
              <p>Signing out removes your study data from this device. It stays safe in your account.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-accent text-sm"
                  onClick={async () => {
                    await fullSync();
                    await getSupabase()?.auth.signOut();
                    await clearPersonalData();
                    setConfirmingSignOut(false);
                  }}
                >
                  Sign out
                </button>
                <button type="button" className="btn btn-soft text-sm" onClick={() => setConfirmingSignOut(false)}>
                  Stay signed in
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-soft text-sm" onClick={() => setConfirmingSignOut(true)}>
              Sign out
            </button>
          )}
        </div>
      )}
    </SidePanel>
  );
}
