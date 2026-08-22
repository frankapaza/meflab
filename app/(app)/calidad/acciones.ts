"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

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
  revalidatePath("/calidad");
  revalidatePath("/trabajos");
  // Un retrabajo encarece el trabajo: cambia su margen.
  revalidatePath("/reportes");
}

/**
 * Registrar una inspección.
 *
 * El resultado NO viaja en el formulario: lo deduce la base a partir de
 * los puntos. Si lo mandara la pantalla, bastaría con llamar a la API
 * para aprobar un trabajo con el ajuste mal.
 */
export async function registrarInspeccion(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "lider_laboratorio", "lider_area");

    const puntos = JSON.parse(String(formData.get("puntos") ?? "[]")) as {
      puntoId: string;
      descripcion: string;
      critico: boolean;
      conforme: boolean;
      nota?: string;
    }[];

    if (puntos.length === 0) {
      return { ok: false, mensaje: "No hay ningún punto que revisar." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("registrar_inspeccion", {
      p_orden: String(formData.get("ordenId")),
      p_checklist: String(formData.get("checklistId")),
      p_puntos: puntos.map((p) => ({
        punto_id: p.puntoId,
        descripcion: p.descripcion,
        critico: p.critico,
        conforme: p.conforme,
        nota: p.nota ?? null,
      })),
      p_observaciones: String(formData.get("observaciones") ?? "") || undefined,
    });

    if (error) return { ok: false, mensaje: error.message };

    const falloCritico = puntos.some((p) => !p.conforme && p.critico);
    const falloLeve = puntos.some((p) => !p.conforme && !p.critico);

    refrescar();
    return {
      ok: true,
      mensaje: falloCritico
        ? "Trabajo RECHAZADO. Abre el retrabajo para que quede su causa y su costo."
        : falloLeve
          ? "Trabajo aprobado con observaciones."
          : "Trabajo aprobado.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Abrir un retrabajo.
 *
 * La política y el importe tienen que ser coherentes: un retrabajo
 * «cubierto» que se cobra no está cubierto. Lo impone también un
 * constraint; aquí se da el mensaje comprensible.
 */
export async function abrirRetrabajo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio", "lider_area");

    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const politica = String(formData.get("politica") ?? "cubierto");
    const importe = Number(formData.get("importeFacturable") ?? 0);

    if (descripcion.length < 5) {
      return { ok: false, mensaje: "Describe qué hay que rehacer." };
    }
    if (politica === "cubierto" && importe > 0) {
      return {
        ok: false,
        mensaje: "Un retrabajo cubierto por garantía no se le cobra al cliente.",
      };
    }
    if (politica !== "cubierto" && !(importe > 0)) {
      return {
        ok: false,
        mensaje: "Si no está cubierto, indica cuánto se le cobra al cliente.",
      };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("retrabajo").insert({
      tenant_id: ctx.tenantId,
      orden_id: String(formData.get("ordenId")),
      inspeccion_id: String(formData.get("inspeccionId") ?? "") || null,
      causa: String(formData.get("causa") ?? "sin_determinar") as
        "error_laboratorio" | "error_impresion" | "cambio_indicacion"
        | "material_defectuoso" | "ajuste_clinico" | "sin_determinar",
      politica: politica as "cubierto" | "parcial" | "facturable",
      descripcion,
      importe_facturable: importe,
      abierto_por: ctx.usuarioId,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Retrabajo abierto." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Cerrar un retrabajo calculando su costo.
 *
 * El costo no se teclea: se suma del material consumido contra el
 * retrabajo. Tecleado sería una estimación, y una estimación no sirve
 * para saber cuánto cuesta de verdad la mala calidad.
 */
export async function cerrarRetrabajo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "lider_laboratorio");

    const retrabajoId = String(formData.get("retrabajoId"));
    const supabase = await crearClienteServidor();

    const { data: consumos } = await supabase
      .from("movimiento_stock")
      .select("cantidad, costo_unitario")
      .eq("retrabajo_id", retrabajoId)
      .eq("tipo", "consumo");

    const costoMaterial = (consumos ?? []).reduce(
      (s, m) => s + Number(m.cantidad) * Number(m.costo_unitario),
      0,
    );

    const { error } = await supabase
      .from("retrabajo")
      .update({
        cerrado_en: new Date().toISOString(),
        costo_generado: Math.round(costoMaterial * 100) / 100,
      })
      .eq("id", retrabajoId);

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return {
      ok: true,
      mensaje:
        costoMaterial > 0
          ? `Retrabajo cerrado. Costó S/ ${costoMaterial.toFixed(2)} en material.`
          : "Retrabajo cerrado. No se registró consumo de material contra él.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
