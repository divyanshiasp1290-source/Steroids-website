import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Backend not connected yet.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // This is an admin-only login. Verify the signed-in user has the admin role.
  const userId = data.user?.id;
  if (!userId) throw new Error("Unable to verify your account.");
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !roleRow) {
    // Not an admin — sign back out and reject.
    await supabase.auth.signOut();
    throw new Error("This account is not authorized to access the admin panel.");
  }
}

export async function signInCustomer(email: string, password: string) {
  if (!supabase) throw new Error("Backend not connected yet.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpCustomer(email: string, password: string, fullName?: string) {
  if (!supabase) throw new Error("Backend not connected yet.");
  const { data, error } = await supabase.auth.signUp(
    { email, password },
    {
      data: fullName ? { full_name: fullName } : undefined,
    },
  );
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
