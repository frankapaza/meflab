import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/tipos/database";

/**
 * Cliente con `service_role`. SALTA RLS POR COMPLETO.
 *
 * El `import "server-only"` de arriba no es decorativo: hace que importar
 * este archivo desde un componente de cliente FALLE AL COMPILAR. La regla
 * 8 de CLAUDE.md deja de depender de que nadie se despiste.
 *
 * Sólo se usa para lo que la `anon key` no puede hacer por diseño: crear
 * cuentas en `auth.users`. Todo lo demás va por el cliente normal y pasa
 * por RLS.
 *
 * Antes de llamar a cualquier función de aquí hay que haber comprobado el
 * permiso con `exigirRol()`. Aquí no hay red de seguridad: lo que se pida,
 * se hace.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Es una variable de SERVIDOR: " +
        "no debe llevar el prefijo NEXT_PUBLIC_.",
    );
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
