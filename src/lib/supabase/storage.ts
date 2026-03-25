import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase client for Storage only (auth handled by Neon Auth)
let _client: SupabaseClient | null = null;

export function supabaseStorage(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  _client = createClient(url, key);
  return _client;
}
