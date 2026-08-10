import { supabase as client } from "@/integrations/supabase/client";

/**
 * Single storefront + admin database client.
 * Re-exported through this module so every feature imports from one place.
 */
export const supabase = client;
export const isBackendConfigured = true;

export function getClient() {
  return client;
}

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("Backend is not connected yet.");
    this.name = "BackendNotConfiguredError";
  }
}
