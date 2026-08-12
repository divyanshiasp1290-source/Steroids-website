import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { signInCustomer, useAuth } from "@/lib/auth";

const title = "Customer login — Medi Pharma UK";
const description = "Sign in to your Medi Pharma UK account to access your order history and saved details.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LoginPage,
});

const field =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await signInCustomer(form.email, form.password);
      toast.success("Welcome back.");
      navigate({ to: "/account" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user) {
      navigate({ to: "/account" });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  return (
    <>
      <PageHeader eyebrow="Customer" title="Sign in to your account" description={description} />

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

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-accent underline transition-colors hover:text-foreground">
              Create one here.
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
