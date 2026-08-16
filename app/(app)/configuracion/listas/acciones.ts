"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { listaPrecioSchema } from "@/lib/validaciones/lista-precio";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/configuracion/listas";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function guardarLista(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = listaPrecioSchema.parse({
      listaId: crudo.listaId || undefined,
      nombre: crudo.nombre,
      preciosIncluyenIgv: crudo.preciosIncluyenIgv === "1",
      esDefault: crudo.esDefault === "1",
    });

    const supabase = await crearClienteServidor();

    const fila = {
      tenant_id: ctx.tenantId,
      nombre: datos.nombre,
      precios_incluyen_igv: datos.preciosIncluyenIgv,
      // Quitar la marca a la lista anterior lo hace un trigger, en la misma
      // transacción: hacerlo en dos escrituras desde aquí abre la ventana
      // de quedarse sin ninguna lista por defecto.
      es_default: datos.esDefault,
    };

    const { error } = datos.listaId
      ? await supabase.from("lista_precio").update(fila).eq("id", datos.listaId)
      : await supabase.from("lista_precio").insert({ ...fila, created_by: ctx.usuarioId });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya existe una lista con ese nombre." };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    revalidatePath("/configuracion");
    return {
      ok: true,
      mensaje: datos.listaId ? "Lista actualizada." : `Lista ${datos.nombre} creada.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

export async function alternarActivoLista(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador");

    const listaId = String(formData.get("listaId"));
    const activar = formData.get("activar") === "1";

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("lista_precio")
      .update({ activo: activar })
      .eq("id", listaId);

    if (error) {
      if (error.message.includes("lista_precio_default_activa")) {
        return {
          ok: false,
          mensaje:
            "No se puede retirar la lista por defecto. Nombra otra por defecto primero.",
        };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    return { ok: true, mensaje: activar ? "Lista reactivada." : "Lista retirada." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Guarda la tarifa de una lista completa de una vez.
 *
 * En bloque y no fila a fila porque quien ajusta un convenio lo revisa
 * entero: guardar servicio por servicio deja la lista a medio pactar si el
 * usuario se va, y el doctor acaba facturado con dos criterios distintos.
 */
export async function guardarTarifa(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const listaId = String(formData.get("listaId"));
    if (!listaId) return { ok: false, mensaje: "Falta la lista." };

    const supabase = await crearClienteServidor();

    const aGuardar: { servicioId: string; precio: number }[] = [];
    const aBorrar: string[] = [];

    for (const [clave, valor] of formData.entries()) {
      if (!clave.startsWith("precio:")) continue;
      const servicioId = clave.slice("precio:".length);
      const crudo = String(valor).trim();

      // Vacío no es cero: significa "esta lista no fija precio para este
      // servicio", y entonces manda el precio base. Un cero sería regalarlo.
      if (crudo === "") {
        aBorrar.push(servicioId);
        continue;
      }

      const precio = Number(crudo);
      if (!Number.isFinite(precio) || precio < 0) {
        return { ok: false, mensaje: "Hay un precio negativo o mal escrito." };
      }
      aGuardar.push({ servicioId, precio });
    }

    if (aGuardar.length > 0) {
      // El precio se manda TAL COMO SE TECLEÓ y a la columna de lo
      // capturado: el valor de venta lo deriva la base según el modo de
      // captura de esta lista (D-07). Que sea derivado es lo que permite
      // usar un upsert sin que el trigger vuelva a dividir en la rama del
      // conflicto.
      const { error } = await supabase.from("lista_precio_item").upsert(
        aGuardar.map((i) => ({
          tenant_id: ctx.tenantId,
          lista_precio_id: listaId,
          servicio_id: i.servicioId,
          precio_capturado: i.precio,
          updated_by: ctx.usuarioId,
        })),
        { onConflict: "lista_precio_id,servicio_id" },
      );
      if (error) return { ok: false, mensaje: error.message };
    }

    if (aBorrar.length > 0) {
      const { error } = await supabase
        .from("lista_precio_item")
        .delete()
        .eq("lista_precio_id", listaId)
        .in("servicio_id", aBorrar);
      if (error) return { ok: false, mensaje: error.message };
    }

    revalidatePath(`${RUTA}/${listaId}`);
    return {
      ok: true,
      mensaje:
        aGuardar.length === 0
          ? "Tarifa vaciada: esta lista usa el precio base de cada servicio."
          : `Tarifa guardada: ${aGuardar.length} ${aGuardar.length === 1 ? "servicio" : "servicios"} con precio propio.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
