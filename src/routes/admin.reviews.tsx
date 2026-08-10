import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminSection } from "@/components/admin/AdminSection";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rating } from "@/components/ui-kit/Rating";
import { adminDelete, adminUpdateReview, type AdminReview } from "@/lib/api";
import { adminReviewsQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });

type ApprovalFilter = "all" | "approved" | "pending";

function approvalVariant(approved: boolean | null | undefined): "default" | "destructive" {
  return approved ? "default" : "destructive";
}

function AdminReviews() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const { data: reviews = [], isLoading, isError, error, refetch } = useQuery(adminReviewsQuery());
  const didRefetch = useRef(false);

  // Force a fresh fetch on mount so SSR-hydrated (or cached) empty data does not
  // hide existing reviews in the Supabase database.
  useEffect(() => {
    if (didRefetch.current) return;
    didRefetch.current = true;
    void refetch();
  }, [refetch]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["reviews", "featured"] });
  }

  const setApproval = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      adminUpdateReview(id, { is_approved: isApproved }),
    onSuccess: () => {
      invalidate();
      toast.success("Review status updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const setFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      adminUpdateReview(id, { is_featured: isFeatured }),
    onSuccess: () => {
      invalidate();
      toast.success("Featured status updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDelete("reviews", id),
    onSuccess: () => {
      invalidate();
      toast.success("Review deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const filtered = reviews.filter((r) => {
    if (filter === "approved") return Boolean(r.is_approved);
    if (filter === "pending") return !r.is_approved;
    return true;
  });

  const columns: Column<AdminReview>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground">{r.product_name ?? "—"}</p>
          {r.author_location ? <p className="text-xs text-muted-foreground">{r.author_location}</p> : null}
        </div>
      ),
    },
    {
      key: "reviewer",
      header: "Reviewer",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span>{r.author_name}</span>
          {r.is_verified_purchase ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
              <ShieldCheck className="mr-1 h-3 w-3" /> Verified
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (r) => <Rating value={r.rating} />,
    },
    {
      key: "review",
      header: "Review",
      render: (r) => (
        <div className="max-w-md">
          {r.title ? <p className="font-medium text-foreground">{r.title}</p> : null}
          <p className="line-clamp-2 text-xs text-muted-foreground">{r.body}</p>
          {r.is_featured ? (
            <Badge className="mt-1.5 gap-1 border-yellow-500/40 bg-yellow-500/10 text-yellow-600">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> Featured
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={approvalVariant(r.is_approved)}>
          {r.is_approved ? "Approved" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            title={r.is_featured ? "Unfeature review" : "Feature review"}
            className={r.is_featured ? "border-yellow-500/50 text-yellow-600" : ""}
            onClick={() => setFeatured.mutate({ id: r.id, isFeatured: !r.is_featured })}
          >
            <Star
              className={`mr-1.5 h-4 w-4 ${r.is_featured ? "fill-yellow-500 text-yellow-500" : ""}`}
            />
            {r.is_featured ? "Featured" : "Feature"}
          </Button>
          {r.is_approved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproval.mutate({ id: r.id, isApproved: false })}
            >
              <X className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => setApproval.mutate({ id: r.id, isApproved: true })}
            >
              <Check className="mr-1.5 h-4 w-4" /> Approve
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this review?")) remove.mutate(r.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  return (
    <div className="space-y-6">
      <AdminSection
        title="Reviews"
        description={
          pendingCount > 0
            ? `${pendingCount} review${pendingCount === 1 ? "" : "s"} awaiting approval`
            : "All product reviews"
        }
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as ApprovalFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm font-medium text-destructive">Unable to load reviews.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "An unknown error occurred."}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowId={(r) => r.id}
            emptyLabel={
              filter === "all"
                ? "No reviews yet. Reviews submitted by customers will appear here."
                : filter === "approved"
                  ? "No approved reviews."
                  : "No pending reviews."
            }
          />
        )}
      </AdminSection>
    </div>
  );
}
