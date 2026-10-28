/**
 * Supabase connection settings. Both values are public by design (the publishable key only grants
 * what row-level security allows), so they are safe in the browser bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Without these, Mila runs fully local (no accounts, no sync). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Storage bucket for user pictures (painting now; Polaroids in Phase 3). */
export const IMAGES_BUCKET = "room-images";
