import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/tipos/database";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers.
 *
 * En Next 16 `cookies()` es ASÍNCRONO — el acceso síncrono ya no existe.
 * Por eso esta función es async y hay que llamarla con `await` en cada
 * petición: no se puede guardar el cliente en una variable de módulo,
 * porque las cookies pertenecen a la petición, no al proceso.
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies. Se ignora
            // a propósito: proxy.ts ya refrescó la sesión antes de llegar
            // aquí, así que no se pierde nada.
          }
        },
      },
    },
  );
}
