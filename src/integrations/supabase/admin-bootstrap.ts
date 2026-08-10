// Server-only helper to provision the admin account.
// Credentials are read from environment variables (ADMIN_EMAIL / ADMIN_PASSWORD)
// so no password is ever committed to the codebase.
import { supabaseAdmin } from "./client.server";

const MEDIA_BUCKET = "media";

export async function ensureMediaBucket(): Promise<void> {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw error;

  const bucketExists = Array.isArray(buckets) && buckets.some((bucket) => bucket.name === MEDIA_BUCKET);
  if (!bucketExists) {
    const { error: bucketError } = await supabaseAdmin.storage.createBucket(MEDIA_BUCKET, {
      public: true,
    });
    if (bucketError) throw bucketError;
    return;
  }

  const { data: bucket, error: bucketInfoError } = await supabaseAdmin.storage.getBucket(MEDIA_BUCKET);
  if (bucketInfoError) throw bucketInfoError;

  if (bucket && !bucket.public) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(MEDIA_BUCKET, {
      public: true,
    });
    if (updateError) throw updateError;
  }
}

/**
 * Ensures the admin user exists in auth.users (with a confirmed email and a
 * usable password) and that the matching profiles + user_roles('admin') rows
 * are present. This fixes the "400 Bad Request" that occurs when trying to
 * sign in with an admin that was never properly created in auth.users.
 *
 * ONLY run this on the server (never expose supabaseAdmin to the client).
 */
export async function ensureAdminUser(
  email: string,
  password: string,
  fullName = "Administrator",
): Promise<void> {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();

  let userId: string | null = null;
  const match = (existing?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (match) {
    userId = match.id;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    userId = data?.user?.id ?? null;
  }

  if (!userId) throw new Error("Failed to resolve admin user id.");

  // Ensure storage bucket for admin media uploads exists and is public.
  await ensureMediaBucket();

  // Ensure profile exists.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, email, full_name: fullName },
      { onConflict: "id" },
    );
  if (profileError) throw profileError;

  // Ensure admin role exists.
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;
}
