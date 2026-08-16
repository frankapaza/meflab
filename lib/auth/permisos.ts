import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * La SEGUNDA barrera de permisos, y la que de verdad protege del abuso
 * deliberado.
 *
 *   1. `proxy.ts` evita navegar a una pantalla que no toca. Es comodidad.
 *   2. Esto, que cada Server Action llama ANTES de actuar. Sin esto,
 *      cualquiera puede invocar la acción por HTTP sin pasar por la
 *      pantalla — las Server Actions son endpoints, no funciones privadas.
 *   3. RLS, que filtra las filas en la base.
 *
 * Verificar sesión NO es verificar permiso: estar dentro no da derecho a
 * crear usuarios.
 */

export type Contexto = {
  usuarioId: string;
  tenantId: string;
  roles: string[];
  areas: string[];
};

export class SinPermiso extends Error {
  constructor(mensaje = "No tienes permiso para esta acción.") {
    super(mensaje);
    this.name = "SinPermiso";
  }
}

/** Contexto de quien llama, o null si no hay sesión válida. */
export async function contextoActual(): Promise<Contexto | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Sin tenant no hay contexto: es lo que emite el hook para una cuenta
  // desactivada. Se trata igual que no tener sesión.
  if (!claims?.sub || !claims?.tenant_id) return null;

  return {
    usuarioId: String(claims.sub),
    tenantId: String(claims.tenant_id),
    roles: Array.isArray(claims.roles) ? (claims.roles as string[]) : [],
    areas: Array.isArray(claims.areas) ? (claims.areas as string[]) : [],
  };
}

/**
 * Exige que quien llama tenga AL MENOS UNO de los roles indicados.
 * Lanza si no. El permiso es la unión de los roles (AC-01 §7.2).
 */
export async function exigirRol(...roles: string[]): Promise<Contexto> {
  const ctx = await contextoActual();
  if (!ctx) throw new SinPermiso("Tu sesión no es válida. Vuelve a entrar.");

  if (!roles.some((r) => ctx.roles.includes(r))) {
    throw new SinPermiso();
  }

  return ctx;
}
