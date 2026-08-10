import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { subscribeToNewsletter } from "@/lib/api";
import { cn } from "@/lib/utils";

export function NewsletterForm({ variant = "block" }: { variant?: "block" | "inline" }) {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: (value: string) => subscribeToNewsletter(value),
    onSuccess: () => {
      toast.success("You're on the list.");
      setEmail("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (email) mutation.mutate(email);
      }}
      className={cn(
        "flex items-center gap-3 border-b pb-2",
        variant === "block" ? "border-primary-foreground/30" : "border-border",
      )}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:text-accent disabled:opacity-50"
      >
        {mutation.isPending ? "Sending" : "Join"}
      </button>
    </form>
  );
}
