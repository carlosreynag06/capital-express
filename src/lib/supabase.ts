import { createClient, SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
export function supabase() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key)
      throw new Error(
        'Falta configurar la conexión con Capital Express. Revise las variables de entorno.',
      );
    client = createClient(url, key);
  }
  return client;
}
