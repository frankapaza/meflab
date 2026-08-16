"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para componentes de navegador.
 *
 * Sólo lleva la `anon key`, que sin RLS correcto no sirve de nada — y por
 * eso RLS es obligatorio en todas las tablas. La `service_role` NUNCA
 * llega aquí (regla 8 de CLAUDE.md).
 */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
