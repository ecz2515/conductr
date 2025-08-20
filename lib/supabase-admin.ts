// lib/supabase-admin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required Supabase environment variables");
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  
  return supabaseClient;
}

export const sb = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  }
});
