"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; mensaje: string | null };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

function refrescar() {
  revalidatePath("/configuracion/areas");
  // La sugerencia de técnico cambia con las competencias.
  revalidatePath("/produccion");
}

const competenciaSchema = z.object({
  codigo: z.string().trim().min(2, "El código es obligatorio."),
  nombre: z.string().trim().min(3, "El nombre es obligatorio."),
});

export async function guardarCompetencia(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const datos = competenciaSchema.parse({
      codigo: formData.get("codigo") ?? "",
      nombre: formData.get("nombre") ?? "",
    });

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("competencia").insert({
      tenant_id: ctx.tenantId,
      area_id: String(formData.get("areaId")),
      codigo: datos.codigo.toUpperCase(),
      nombre: datos.nombre,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya existe una competencia con ese código." };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescar();
    return { ok: true, mensaje: "Competencia creada." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Declarar (o quitar) la competencia de un técnico.
 *
 * Nivel 0 la borra: es lo que espera quien la marcó por error. Guardar un
 * nivel 0 dejaría una fila que dice «sabe hacerlo, nada», que no
 * significa nada y ensucia la sugerencia.
 */
export async function fijarNivel(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const usuarioId = String(formData.get("usuarioId"));
    const competenciaId = String(formData.get("competenciaId"));
    const nivel = Number(formData.get("nivel"));

    const supabase = await crearClienteServidor();

    if (nivel === 0) {
      const { error } = await supabase
        .from("tecnico_competencia")
        .delete()
        .eq("usuario_id", usuarioId)
        .eq("competencia_id", competenciaId);
      if (error) return { ok: false, mensaje: error.message };
      refrescar();
      return { ok: true, mensaje: "Competencia retirada." };
    }

    if (nivel < 1 || nivel > 3) {
      return { ok: false, mensaje: "El nivel va de 1 a 3." };
    }

    // Quien la fija la acredita: es su firma. AC-01 §8 pide poder
    // distinguir lo respaldado de lo que alguien se atribuyó, y si esto
    // se dejara vacío no habría forma.
    const { error } = await supabase.from("tecnico_competencia").upsert(
      {
        tenant_id: ctx.tenantId,
        usuario_id: usuarioId,
        competencia_id: competenciaId,
        nivel,
        acreditada_por: ctx.usuarioId,
        acreditada_en: new Date().toISOString(),
      },
      { onConflict: "usuario_id,competencia_id" },
    );

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Nivel actualizado y acreditado." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Qué competencia exige un proceso, y con qué nivel mínimo.
 *
 * Sin esto no hay forma de sugerir a quién asignar una etapa: se sabría
 * quién está libre, no quién sabe hacerla.
 */
export async function fijarExigencia(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const procesoId = String(formData.get("procesoId"));
    const competenciaId = String(formData.get("competenciaId") ?? "");
    const nivelMinimo = Number(formData.get("nivelMinimo") ?? 2);

    const supabase = await crearClienteServidor();

    // Sin competencia = el proceso no exige ninguna. Se borran las que
    // tuviera: dejarlas convertiría «ya no la exige» en «la exige y
    // además otra».
    const { error: errorBorrado } = await supabase
      .from("proceso_competencia")
      .delete()
      .eq("proceso_id", procesoId);

    if (errorBorrado) return { ok: false, mensaje: errorBorrado.message };

    if (!competenciaId) {
      refrescar();
      return { ok: true, mensaje: "El proceso ya no exige competencia." };
    }

    if (nivelMinimo < 1 || nivelMinimo > 3) {
      return { ok: false, mensaje: "El nivel mínimo va de 1 a 3." };
    }

    const { error } = await supabase.from("proceso_competencia").insert({
      tenant_id: ctx.tenantId,
      proceso_id: procesoId,
      competencia_id: competenciaId,
      nivel_minimo: nivelMinimo,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Exigencia del proceso actualizada." };
  } catch (e) {
    return comoMensaje(e);
  }
}
