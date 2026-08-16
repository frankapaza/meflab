"use server";

import { revalidatePath } from "next/cache";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; mensaje: string | null };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

function refrescar() {
  revalidatePath("/produccion");
  revalidatePath("/produccion/mis-tareas");
  revalidatePath("/trabajos");
}

/** Asignar o desasignar una etapa a un técnico. */
export async function asignarTarea(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "lider_laboratorio", "lider_area");

    const tareaId = String(formData.get("tareaId"));
    const tecnicoId = String(formData.get("tecnicoId") ?? "");

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("tarea_produccion")
      .update({
        tecnico_id: tecnicoId || null,
        // El estado sigue a la asignación: una etapa con dueño ya no está
        // "sin asignar", y pedir los dos datos por separado garantiza que
        // tarde o temprano discrepen.
        estado: tecnicoId ? "asignada" : "sin_asignar",
      })
      .eq("id", tareaId)
      .in("estado", ["sin_asignar", "asignada"]);

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return {
      ok: true,
      mensaje: tecnicoId ? "Etapa asignada." : "Etapa liberada.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * El técnico registra su etapa. UN toque.
 *
 * Es el requisito de mayor riesgo del proyecto: si registrar una etapa
 * cuesta, el módulo de producción se queda vacío y con él la mitad de los
 * indicadores. Por eso no hay formulario, ni confirmación, ni campos de
 * hora: la marca de tiempo la pone el servidor al pulsar.
 */
export async function marcarTarea(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("tecnico", "lider_area", "lider_laboratorio", "administrador");

    const tareaId = String(formData.get("tareaId"));
    const accion = String(formData.get("accion"));

    const supabase = await crearClienteServidor();
    const ahora = new Date().toISOString();

    const cambio =
      accion === "iniciar"
        ? { estado: "en_curso" as const, iniciada_en: ahora, terminada_en: null }
        : { estado: "completa" as const, terminada_en: ahora };

    const { error } = await supabase
      .from("tarea_produccion")
      .update(cambio)
      .eq("id", tareaId);

    if (error) {
      // La base exige inicio Y fin para dar una etapa por completa: es lo
      // que sostiene los KPI de tiempo.
      if (error.message.includes("tarea_completa_tiene_tiempos")) {
        return { ok: false, mensaje: "Empieza la etapa antes de darla por terminada." };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescar();
    return { ok: true, mensaje: accion === "iniciar" ? "Etapa iniciada." : "Etapa terminada." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/** Mueve la orden por el tablero. El historial lo escribe un trigger. */
export async function cambiarEstadoOrden(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "lider_laboratorio", "lider_area", "recepcion");

    const ordenId = String(formData.get("ordenId"));
    const estadoId = String(formData.get("estadoId"));

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("cambiar_estado_orden", {
      p_orden: ordenId,
      p_estado: estadoId,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Estado actualizado." };
  } catch (e) {
    return comoMensaje(e);
  }
}
