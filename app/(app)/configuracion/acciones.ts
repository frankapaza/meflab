"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { servicioSchema } from "@/lib/validaciones/servicio";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/configuracion";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function guardarServicio(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // El catálogo lo mantiene el Administrador. Gerencia lo consulta.
    const ctx = await exigirRol("administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = servicioSchema.parse({
      ...crudo,
      servicioId: crudo.servicioId || undefined,
      activo: crudo.activo === "1",
    });

    const supabase = await crearClienteServidor();

    // El área es obligatoria y hoy siempre es GENERAL (D-06): el esquema
    // la lleva desde el día 1, la interfaz no la pide todavía.
    const { data: area } = await supabase
      .from("area")
      .select("id")
      .eq("es_default", true)
      .single();

    if (!area) {
      return { ok: false, mensaje: "El laboratorio no tiene área por defecto." };
    }

    let categoriaId = datos.categoriaId || null;

    // Crear la categoría desde aquí evita una segunda pantalla para algo
    // que casi siempre se decide al dar de alta el primer servicio.
    if (datos.categoriaNueva) {
      const { data: nueva, error: errorCat } = await supabase
        .from("categoria_servicio")
        .insert({ tenant_id: ctx.tenantId, nombre: datos.categoriaNueva })
        .select("id")
        .single();

      if (errorCat) {
        if (errorCat.code === "23505") {
          return { ok: false, mensaje: "Ya existe una categoría con ese nombre." };
        }
        return { ok: false, mensaje: errorCat.message };
      }
      categoriaId = nueva.id;
    }

    const fila = {
      tenant_id: ctx.tenantId,
      area_id: area.id,
      categoria_id: categoriaId,
      codigo: datos.codigo.toUpperCase(),
      nombre: datos.nombre,
      // Se manda TAL COMO SE TECLEÓ, y a la columna de lo capturado. El
      // valor de venta lo deriva la base según el modo de captura de la
      // lista por defecto (D-07); escribirlo desde aquí no serviría de
      // nada, el trigger lo recalcula.
      precio_capturado: datos.precio,
      afectacion: datos.afectacion,
      flujo_id: datos.flujoId || null,
      activo: datos.activo ?? true,
    };

    const { error } = datos.servicioId
      ? await supabase.from("servicio").update(fila).eq("id", datos.servicioId)
      : await supabase.from("servicio").insert({ ...fila, created_by: ctx.usuarioId });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: `Ya existe un servicio con el código ${fila.codigo}.` };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: datos.servicioId ? "Servicio actualizado." : `${datos.nombre} añadido al catálogo.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/** No se borra: el servicio vive en órdenes ya facturadas. */
export async function alternarActivoServicio(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador");

    const servicioId = String(formData.get("servicioId"));
    const activar = formData.get("activar") === "1";

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("servicio")
      .update({ activo: activar })
      .eq("id", servicioId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: activar
        ? "Servicio reactivado."
        : "Servicio retirado. No aparecerá en órdenes nuevas; las anteriores lo conservan.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
