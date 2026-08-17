"use server";

import { revalidatePath } from "next/cache";

import { SinPermiso, contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { PANELES, type Panel } from "@/lib/dominio/panel";

export type Resultado = { ok: boolean; mensaje: string | null };

/**
 * Guarda qué gráficos quiere ver el propio usuario.
 *
 * Va por RPC porque la política de escritura de `usuario` es del
 * Administrador y una política propia le abriría la fila entera — con
 * ella podría cambiarse el correo. La función toca una sola columna.
 */
export async function guardarPaneles(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await contextoActual();
    if (!ctx) throw new SinPermiso("Sin sesión.");

    const validos = new Set(PANELES.map((p) => p.id));
    const elegidos = formData
      .getAll("panel")
      .map(String)
      .filter((v): v is Panel => validos.has(v as Panel));

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("fijar_paneles", { p_paneles: elegidos });

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/");
    return {
      ok: true,
      mensaje:
        elegidos.length === 0
          ? "Dashboard vacío. Puedes volver a añadir gráficos cuando quieras."
          : "Listo.",
    };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
    if (e instanceof Error) return { ok: false, mensaje: e.message };
    return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
  }
}

/** Vuelve a lo que corresponde a los roles de la persona. */
export async function restaurarPaneles(): Promise<Resultado> {
  try {
    const ctx = await contextoActual();
    if (!ctx) throw new SinPermiso("Sin sesión.");

    const supabase = await crearClienteServidor();
    // null, no []: es la diferencia entre "nunca lo he tocado" y "no
    // quiero ver ninguno". Y `null` explícito, no `undefined`: undefined
    // se cae del JSON y la función recibiría su valor por defecto.
    const { error } = await supabase.rpc("fijar_paneles", {
      p_paneles: null as unknown as never,
    });

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/");
    return { ok: true, mensaje: "Restaurado a lo que ve tu rol." };
  } catch (e) {
    if (e instanceof Error) return { ok: false, mensaje: e.message };
    return { ok: false, mensaje: "Algo falló." };
  }
}
