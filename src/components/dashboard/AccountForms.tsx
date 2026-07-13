"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Loader2, Pencil } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

function Saved({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8, x: -4 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1 text-xs font-semibold text-good"
        >
          <Check className="h-3.5 w-3.5" /> Saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name.trim() !== initialName;

  async function save() {
    if (!dirty) {
      setEditing(false);
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save.");
      return;
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label mb-0">Display name</label>
        <Saved show={saved} />
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={name}
          disabled={!editing || pending}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="input disabled:opacity-70"
        />
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={pending}
              className="btn btn-primary shrink-0"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
            <button
              onClick={() => {
                setName(initialName);
                setEditing(false);
                setError(null);
              }}
              disabled={pending}
              className="btn btn-ghost shrink-0"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="btn btn-ghost shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't change password.");
      return;
    }
    setCurrent("");
    setNext("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between">
        <label className="label mb-0">Change password</label>
        <Saved show={saved} />
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className="input"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          className="input"
        />
      </div>

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      <button
        type="submit"
        disabled={pending || !current || next.length < 8}
        className="btn btn-ghost mt-3"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function DeleteAccount({ reviewCount }: { reviewCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function destroy() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't delete the account.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-bad/30 bg-bad/[0.04] p-6">
      <p className="flex items-center gap-2 font-bold text-bad">
        <AlertTriangle className="h-4 w-4" /> Delete account
      </p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Permanently deletes your account and all{" "}
        <strong className="text-ink">{reviewCount}</strong> of your saved
        reviews. This cannot be undone.
      </p>

      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                autoComplete="current-password"
                className="input max-w-sm"
              />
              {error && <p className="mt-2 text-sm text-bad">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={destroy}
                  disabled={pending || !password}
                  className="btn btn-danger"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete my account
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    setPassword("");
                    setError(null);
                  }}
                  disabled={pending}
                  className="btn btn-ghost"
                >
                  Keep my account
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOpen(true)}
            className="btn btn-danger mt-4"
          >
            Delete account
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
