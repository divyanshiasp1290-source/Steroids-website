import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { signIn, signOut, useAuth } from "@/lib/auth";

const title = "Admin Sign In — Medi Pharma UK";
const description = "Restricted area. Authorized administrators only.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

function AuthPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn(form.email, form.password);
      toast.success("Welcome back.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <section className="container-page section-y">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="text-2xl font-semibold">Already signed in</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You are already signed in. Sign out first if you want to access a different administrator account.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/account"
              className="rounded-md border border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-secondary"
            >
              My account
            </Link>
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                await signOut();
                setBusy(false);
              }}
              className="rounded-md bg-primary px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Restricted"
        title="Administrator sign in"
        description="This area is for authorized administrators only."
      />

      <section className="container-page section-y">
        <div className="mx-auto w-full max-w-md">
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={field}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              {busy ? "Please wait…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
