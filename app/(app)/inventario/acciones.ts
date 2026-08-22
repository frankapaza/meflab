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
  revalidatePath("/inventario");
  // El consumo cambia el costo real de un trabajo, y con él su margen.
  revalidatePath("/reportes");
  revalidatePath("/");
}

const materialSchema = z.object({
  codigo: z.string().trim().min(2, "El código es obligatorio."),
  nombre: z.string().trim().min(3, "El nombre es obligatorio."),
  unidad: z.string().trim().min(1).default("unidad"),
  costoReferencia: z.coerce.number().min(0, "El costo no puede ser negativo."),
  umbralBajo: z.coerce.number().min(0),
  umbralCritico: z.coerce.number().min(0),
  controlaLote: z.coerce.boolean().default(false),
}).refine((d) => d.umbralCritico <= d.umbralBajo, {
  // Si el crítico fuese mayor que el bajo, el material estaría en crítico
  // antes que en bajo y los dos avisos se dispararían al revés.
  message: "El umbral crítico tiene que ser menor o igual que el bajo.",
  path: ["umbralCritico"],
});

export async function guardarMaterial(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const datos = materialSchema.parse({
      codigo: formData.get("codigo") ?? "",
      nombre: formData.get("nombre") ?? "",
      unidad: formData.get("unidad") || "unidad",
      costoReferencia: formData.get("costoReferencia") || 0,
      umbralBajo: formData.get("umbralBajo") || 0,
      umbralCritico: formData.get("umbralCritico") || 0,
      controlaLote: formData.get("controlaLote") === "1",
    });

    const id = String(formData.get("materialId") ?? "");
    const supabase = await crearClienteServidor();

    const fila = {
      tenant_id: ctx.tenantId,
      area_id: String(formData.get("areaId")),
      codigo: datos.codigo.toUpperCase(),
      nombre: datos.nombre,
      unidad: datos.unidad,
      costo_referencia: datos.costoReferencia,
      umbral_bajo: datos.umbralBajo,
      umbral_critico: datos.umbralCritico,
      controla_lote: datos.controlaLote,
    };

    const { error } = id
      ? await supabase.from("material").update(fila).eq("id", id)
      : await supabase.from("material").insert(fila);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya existe un material con ese código." };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescar();
    return { ok: true, mensaje: id ? "Material actualizado." : "Material creado." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Entrada de material: una compra, o una devolución al almacén.
 *
 * Si el material se controla por lotes, la entrada CREA el lote — con su
 * costo. El costo vive en el lote y no en el material porque el mismo
 * disco cuesta distinto según cuándo se compró, y lo ya fabricado no
 * puede cambiar de costo porque hoy salga más barato.
 */
export async function registrarEntrada(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const materialId = String(formData.get("materialId"));
    const cantidad = Number(formData.get("cantidad"));
    const costo = Number(formData.get("costoUnitario"));
    const codigoLote = String(formData.get("codigoLote") ?? "").trim();
    const venceEl = String(formData.get("venceEl") ?? "").trim();
    const ubicacion = String(formData.get("ubicacion") ?? "").trim();

    if (!(cantidad > 0)) {
      return { ok: false, mensaje: "La cantidad tiene que ser mayor que cero." };
    }
    if (costo < 0) {
      return { ok: false, mensaje: "El costo no puede ser negativo." };
    }

    const supabase = await crearClienteServidor();

    const { data: material } = await supabase
      .from("material")
      .select("controla_lote")
      .eq("id", materialId)
      .maybeSingle();

    if (!material) return { ok: false, mensaje: "Ese material no existe." };

    let loteId: string | null = null;

    if (material.controla_lote) {
      if (!codigoLote) {
        return {
          ok: false,
          mensaje: "Este material se controla por lotes: indica el código del lote.",
        };
      }

      const { data: lote, error: errorLote } = await supabase
        .from("lote")
        .insert({
          tenant_id: ctx.tenantId,
          material_id: materialId,
          codigo: codigoLote,
          costo_unitario: costo,
          vence_el: venceEl || null,
          ubicacion: ubicacion || null,
        })
        .select("id")
        .single();

      if (errorLote) {
        if (errorLote.code === "23505") {
          return {
            ok: false,
            mensaje: "Ese lote ya está registrado para este material.",
          };
        }
        return { ok: false, mensaje: errorLote.message };
      }
      loteId = lote.id;
    }

    const { error } = await supabase.from("movimiento_stock").insert({
      tenant_id: ctx.tenantId,
      material_id: materialId,
      lote_id: loteId,
      tipo: "entrada",
      cantidad,
      costo_unitario: costo,
      motivo: "Entrada de almacén",
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Entrada registrada." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Consumir material contra un trabajo.
 *
 * Va por la función de la base, que comprueba existencias antes de
 * descontar. Hacerlo aquí con un update dejaría el almacén en negativo
 * en cuanto dos técnicos consumieran a la vez.
 */
export async function consumir(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "lider_laboratorio", "lider_area", "tecnico");

    const supabase = await crearClienteServidor();

    // `p_lote` es nulo cuando el material no se controla por lotes, y la
    // función lo admite. Los tipos que genera Supabase no modelan la
    // nulabilidad de los argumentos —los declara todos `string`— así que
    // el cast va aquí, acotado a esta llamada, en vez de relajar el tipo.
    const args = {
      p_material: String(formData.get("materialId")),
      p_lote: String(formData.get("loteId") ?? "") || null,
      p_cantidad: Number(formData.get("cantidad")),
      p_orden: String(formData.get("ordenId") ?? "") || null,
      p_motivo: String(formData.get("motivo") ?? "") || null,
    } as unknown as { p_material: string; p_lote: string; p_cantidad: number };

    const { error } = await supabase.rpc("consumir_material", args);

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Consumo registrado y descontado del almacén." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Merma: material que se rompió, se venció o se perdió.
 *
 * Exige motivo. Una merma sin explicación es material que se evaporó, y
 * un almacén donde el material se evapora deja de servir para nada.
 */
export async function registrarMerma(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador", "lider_laboratorio");

    const motivo = String(formData.get("motivo") ?? "").trim();
    const cantidad = Number(formData.get("cantidad"));

    if (motivo.length < 5) {
      return { ok: false, mensaje: "Escribe por qué se perdió el material." };
    }
    if (!(cantidad > 0)) {
      return { ok: false, mensaje: "La cantidad tiene que ser mayor que cero." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("movimiento_stock").insert({
      tenant_id: ctx.tenantId,
      material_id: String(formData.get("materialId")),
      lote_id: String(formData.get("loteId") ?? "") || null,
      tipo: "merma",
      cantidad,
      costo_unitario: Number(formData.get("costoUnitario") ?? 0),
      motivo,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return { ok: true, mensaje: "Merma registrada." };
  } catch (e) {
    return comoMensaje(e);
  }
}
