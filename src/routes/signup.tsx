import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { signUpCustomer, useAuth } from "@/lib/auth";

const title = "Create an account — Medi Pharma UK";
const description = "Register a new customer account to save your details and track past orders.";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SignupPage,
});

const field =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await signUpCustomer(form.email, form.password, form.name.trim() || undefined);
      if (data?.session) {
        toast.success("Your account has been created.");
        navigate({ to: "/account" });
      } else {
        toast.success("Check your email to confirm your account.");
        navigate({ to: "/login" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register.");
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
      <PageHeader eyebrow="Customer" title="Create your account" description={description} />

      <section className="container-page section-y">
        <div className="mx-auto w-full max-w-md">
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="text"
              placeholder="Full name (optional)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={field}
            />
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
              {busy ? "Please wait…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-accent underline transition-colors hover:text-foreground">
              Sign in here.
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
