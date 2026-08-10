-- Add verified-purchase flag to reviews.
-- Users who have received a delivered order containing a product can mark their
-- review as a "Verified Purchase". Set automatically by submitProductReview().
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean NOT NULL DEFAULT false;

