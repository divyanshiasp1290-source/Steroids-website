import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchProfile, submitProductReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function ReviewFormDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [profileName, setProfileName] = useState("");

  // Auto-fill the Name field with the signed-in user's name.
  const signedInName =
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    (user?.user_metadata?.["name"] as string | undefined) ||
    "";

  // Also try to load the user's profile full_name (profiles table) for a more
  // reliable source when metadata is empty.
  useEffect(() => {
    let cancelled = false;
    if (open && user?.id) {
      fetchProfile(user.id)
        .then((profile) => {
          if (!cancelled && profile?.full_name) setProfileName(profile.full_name);
        })
        .catch(() => {
          /* ignore — fall back to metadata name */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const resolvedName = signedInName || profileName;

  useEffect(() => {
    if (open) {
      setName(resolvedName);
      setRating(0);
      setHover(0);
      setTitle("");
      setBody("");
    }
  }, [open, resolvedName]);

  useEffect(() => {
    // Keep the name in sync if it changes while the dialog is open.
    if (open && !name && resolvedName) setName(resolvedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedName, open]);

  const submit = useMutation({
    mutationFn: () =>
      submitProductReview({ productId, authorName: name, rating, title, body }),
    onSuccess: () => {
      toast.success("Thanks — your review has been posted.");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Unable to submit review."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rating) {
              toast.error("Please select a star rating.");
              return;
            }
            submit.mutate();
          }}
        >
          <div>
            <Label>Your rating</Label>
            <div className="mt-2 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                  aria-label={`${i} star${i > 1 ? "" : ""}`}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      (hover || rating) >= i
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-muted-foreground/40",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating ? `${rating} / 5` : ""}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-name">Name</Label>
            <Input
              id="review-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-title">Review title</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Great quality"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience with this product…"
              maxLength={2000}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submit.isPending}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {submit.isPending ? "Posting…" : "Post review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
