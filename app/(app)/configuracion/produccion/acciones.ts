"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { flujoSchema, procesoSchema } from "@/lib/validaciones/produccion";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/configuracion/produccion";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

/** El área es obligatoria en el esquema y hoy siempre es GENERAL (D-06). */
async function areaPorDefecto(supabase: Awaited<ReturnType<typeof crearClienteServidor>>) {
  const { data } = await supabase.from("area").select("id").eq("es_default", true).single();
  return data?.id ?? null;
}

export async function guardarProceso(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = procesoSchema.parse({
      ...crudo,
      procesoId: crudo.procesoId || undefined,
      activo: crudo.activo === "1",
    });

    const supabase = await crearClienteServidor();
    const areaId = await areaPorDefecto(supabase);
    if (!areaId) return { ok: false, mensaje: "El laboratorio no tiene área por defecto." };

    const fila = {
      tenant_id: ctx.tenantId,
      area_id: areaId,
      codigo: datos.codigo.toUpperCase(),
      nombre: datos.nombre,
      horas_estimadas: datos.horasEstimadas,
      activo: datos.activo ?? true,
    };

    const { error } = datos.procesoId
      ? await supabase.from("proceso").update(fila).eq("id", datos.procesoId)
      : await supabase.from("proceso").insert(fila);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: `Ya existe un proceso con el código ${fila.codigo}.` };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: datos.procesoId ? "Proceso actualizado." : `Proceso ${fila.codigo} creado.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

export async function guardarFlujo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = flujoSchema.parse({
      ...crudo,
      flujoId: crudo.flujoId || undefined,
      activo: crudo.activo === "1",
    });

    const supabase = await crearClienteServidor();
    const areaId = await areaPorDefecto(supabase);
    if (!areaId) return { ok: false, mensaje: "El laboratorio no tiene área por defecto." };

    const fila = {
      tenant_id: ctx.tenantId,
      area_id: areaId,
      nombre: datos.nombre,
      activo: datos.activo ?? true,
    };

    const { data, error } = datos.flujoId
      ? await supabase
          .from("flujo_produccion")
          .update(fila)
          .eq("id", datos.flujoId)
          .select("id")
          .single()
      : await supabase
          .from("flujo_produccion")
          .insert({ ...fila, created_by: ctx.usuarioId })
          .select("id")
          .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya existe un flujo con ese nombre." };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    revalidatePath(`${RUTA}/${data.id}`);
    return {
      ok: true,
      mensaje: datos.flujoId
        ? "Flujo actualizado."
        : `Flujo ${datos.nombre} creado. Ahora dale sus etapas.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Reescribe la secuencia de etapas de un flujo.
 *
 * Va por RPC porque tiene que ser atómico: borrar las etapas y volver a
 * insertarlas en dos llamadas deja el flujo VACÍO si la segunda falla, y un
 * flujo vacío mete las órdenes en producción sin ninguna tarea.
 */
export async function guardarEtapas(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador");

    const flujoId = String(formData.get("flujoId"));
    const secuencia = String(formData.get("secuencia") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("fijar_etapas_flujo", {
      p_flujo: flujoId,
      p_procesos: secuencia,
    });

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(`${RUTA}/${flujoId}`);
    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje:
        secuencia.length === 0
          ? "Flujo sin etapas. Las órdenes que lo usen entrarán en producción sin nada que hacer."
          : `Secuencia guardada: ${secuencia.length} ${secuencia.length === 1 ? "etapa" : "etapas"}.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

export async function alternarActivoProceso(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador");

    const procesoId = String(formData.get("procesoId"));
    const activar = formData.get("activar") === "1";

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("proceso")
      .update({ activo: activar })
      .eq("id", procesoId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(RUTA);
    return { ok: true, mensaje: activar ? "Proceso reactivado." : "Proceso retirado." };
  } catch (e) {
    return comoMensaje(e);
  }
}
