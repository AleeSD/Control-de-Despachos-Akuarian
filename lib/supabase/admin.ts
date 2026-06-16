import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: SALTA la RLS. SOLO usar en el servidor
// (import/export), nunca en componentes de cliente. La clave jamás se
// expone al navegador porque no tiene el prefijo NEXT_PUBLIC_.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
