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

/**
 * Cambiar los datos del laboratorio afecta a lo que se imprime en cada
 * comprobante. Se refresca todo lo que los usa.
 */
function refrescar() {
  revalidatePath("/configuracion/laboratorio");
  revalidatePath("/comprobante", "layout");
  revalidatePath("/estado-de-cuenta", "layout");
  revalidatePath("/facturacion");
  revalidatePath("/reportes");
}

const identidadSchema = z.object({
  nombre: z.string().trim().min(3, "El nombre del laboratorio es obligatorio."),
  // El RUC va impreso en cada comprobante. Once dígitos o nada.
  ruc: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "El RUC son 11 dígitos.")
    .optional()
    .or(z.literal("")),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function guardarIdentidad(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const datos = identidadSchema.parse({
      nombre: formData.get("nombre") ?? "",
      ruc: formData.get("ruc") ?? "",
      direccion: formData.get("direccion") ?? "",
    });

    const supabase = await crearClienteServidor();

    const { error } = await supabase
      .from("tenant")
      .update({ nombre: datos.nombre, ruc: datos.ruc || null })
      .eq("id", ctx.tenantId);

    if (error) return { ok: false, mensaje: error.message };

    const sedeId = String(formData.get("sedeId") ?? "");
    if (sedeId) {
      const { error: errorSede } = await supabase
        .from("sede")
        .update({ direccion: datos.direccion || null })
        .eq("id", sedeId);
      if (errorSede) return { ok: false, mensaje: errorSede.message };
    }

    refrescar();
    return { ok: true, mensaje: "Datos del laboratorio actualizados." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Los parámetros del laboratorio viven en `configuracion`, no en el
 * código: el IGV cambia por decreto y el costo de la hora con los
 * sueldos. Ninguno de los dos puede exigir un despliegue.
 */
export async function guardarParametro(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const clave = String(formData.get("clave"));
    const valor = Number(formData.get("valor"));

    if (!Number.isFinite(valor) || valor < 0) {
      return { ok: false, mensaje: "El valor tiene que ser un número no negativo." };
    }

    // Cada parámetro guarda su número bajo una clave distinta dentro del
    // jsonb. Se escribe el objeto entero para no depender de que exista.
    const forma: Record<string, { campo: string; descripcion: string; tope?: number }> = {
      igv: { campo: "tasa", descripcion: "Tasa de IGV vigente", tope: 1 },
      costo_hora: {
        campo: "soles",
        descripcion: "Costo de una hora de taller, para el costo real por orden",
      },
      dias_credito_default: {
        campo: "dias",
        descripcion: "Días de crédito por defecto para un cliente nuevo",
        tope: 365,
      },
    };

    const f = forma[clave];
    if (!f) return { ok: false, mensaje: "Ese parámetro no se puede editar aquí." };

    if (f.tope !== undefined && valor > f.tope) {
      return {
        ok: false,
        mensaje:
          clave === "igv"
            ? "El IGV se guarda como fracción: 0.18, no 18."
            : `El valor no puede pasar de ${f.tope}.`,
      };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.from("configuracion").upsert(
      {
        tenant_id: ctx.tenantId,
        clave,
        valor: { [f.campo]: valor },
        descripcion: f.descripcion,
      },
      { onConflict: "tenant_id,clave" },
    );

    if (error) return { ok: false, mensaje: error.message };

    refrescar();
    return {
      ok: true,
      mensaje:
        clave === "igv"
          ? "IGV actualizado. Los documentos ya emitidos conservan su tasa."
          : "Parámetro actualizado.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
