"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { documentoSchema, notaSchema } from "@/lib/validaciones/facturacion";

export type Resultado = { ok: boolean; mensaje: string | null; documentoId?: string };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

/** Refresca todo lo que enseña deuda. Todo lee de v_cartera, así que
 *  ninguna de estas pantallas puede quedarse con una cifra distinta. */
function refrescarDinero() {
  revalidatePath("/facturacion");
  revalidatePath("/cobranzas");
  revalidatePath("/caja");
  revalidatePath("/clientes");
  revalidatePath("/");
}

export async function emitirDocumento(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador");

    const datos = documentoSchema.parse({
      clienteId: formData.get("clienteId") ?? "",
      tipo: formData.get("tipo") ?? "factura",
      serie: formData.get("serie") ?? "",
      diasCredito: formData.get("diasCredito") || undefined,
      observaciones: formData.get("observaciones") ?? "",
      lineas: JSON.parse(String(formData.get("lineas") ?? "[]")),
    });

    // Sólo Administrador y Gerencia pueden pasar de la línea de crédito.
    // Recepción puede EMITIR, pero no autorizar un exceso: si lo hiciera,
    // el control no sería un control.
    const motivoAutorizacion = String(formData.get("motivoAutorizacion") ?? "").trim();
    const puedeAutorizar = ctx.roles.some((r) =>
      ["administrador", "gerencia"].includes(r),
    );

    const supabase = await crearClienteServidor();

    // Una sola llamada: cabecera, detalle, correlativo y cuenta por cobrar
    // en la misma transacción. A medias no es medio documento — es un
    // correlativo quemado, o deuda sin factura.
    const { data, error } = await supabase.rpc("emitir_documento", {
      p_cliente: datos.clienteId,
      p_tipo: datos.tipo,
      p_serie: datos.serie,
      p_lineas: datos.lineas.map((l) => ({
        detalle_trabajo_id: l.detalleTrabajoId || null,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        afectacion: l.afectacion,
      })),
      p_dias_credito: datos.diasCredito,
      p_observaciones: datos.observaciones || undefined,
      // Sólo se manda si hay motivo Y el rol puede darlo. Sin los dos, la
      // base rechaza el exceso — que es lo que tiene que pasar.
      p_autorizado_por:
        puedeAutorizar && motivoAutorizacion ? ctx.usuarioId : undefined,
      p_motivo_autorizacion:
        puedeAutorizar && motivoAutorizacion ? motivoAutorizacion : undefined,
    });

    if (error) {
      if (error.message.includes("documento_detalle_no_doble_facturacion")) {
        return {
          ok: false,
          mensaje: "Alguno de esos trabajos ya está facturado. Revisa el listado de pendientes.",
        };
      }
      if (error.message.includes("No existe la serie")) {
        return {
          ok: false,
          mensaje: `No hay una serie ${datos.serie} configurada para ese tipo de documento.`,
        };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescarDinero();
    return { ok: true, mensaje: "Documento emitido.", documentoId: data as string };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Anular un documento elimina su deuda (RN-013).
 *
 * La base lo rechaza si ya tiene pagos aplicados: anularlo entonces
 * dejaría dinero cobrado contra una factura que no existe.
 */
export async function anularDocumento(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // Anular es de Gerencia y Administrador: es la operación que borra
    // deuda de la cartera.
    const ctx = await exigirRol("administrador", "gerencia");

    const documentoId = String(formData.get("documentoId"));
    const motivo = String(formData.get("motivo") ?? "").trim();

    if (motivo.length < 5) {
      return { ok: false, mensaje: "Escribe el motivo de la anulación." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("documento_venta")
      .update({
        estado: "anulado",
        anulado_en: new Date().toISOString(),
        anulado_por: ctx.usuarioId,
        motivo_anulacion: motivo,
      })
      .eq("id", documentoId);

    if (error) {
      if (error.message.includes("pagos aplicados")) {
        return {
          ok: false,
          mensaje: "Ese documento ya tiene pagos aplicados. Primero hay que revertirlos.",
        };
      }
      return { ok: false, mensaje: error.message };
    }

    refrescarDinero();
    return { ok: true, mensaje: "Documento anulado. Su deuda salió de la cartera." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Emitir una nota de crédito o débito sobre un documento ya emitido.
 *
 * La nota NO crea cuenta por cobrar propia: mueve la del documento que
 * corrige. Toda esa lógica vive en `emitir_documento`, en la base, para
 * que sea una sola transacción — una nota emitida cuya rebaja no llegó a
 * aplicarse dejaría al cliente debiendo algo que ya se le perdonó.
 */
export async function emitirNota(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // Rebajar deuda no es del mostrador. Es la misma frontera que anular.
    await exigirRol("administrador", "gerencia");

    const datos = notaSchema.parse({
      documentoRefId: formData.get("documentoRefId") ?? "",
      clienteId: formData.get("clienteId") ?? "",
      tipo: formData.get("tipo") ?? "nota_credito",
      serie: formData.get("serie") ?? "",
      motivo: formData.get("motivo") ?? "",
      observaciones: formData.get("observaciones") ?? "",
      lineas: JSON.parse(String(formData.get("lineas") ?? "[]")),
    });

    const supabase = await crearClienteServidor();

    const { data, error } = await supabase.rpc("emitir_documento", {
      p_cliente: datos.clienteId,
      p_tipo: datos.tipo,
      p_serie: datos.serie,
      p_lineas: datos.lineas.map((l) => ({
        // Una nota nunca "consume" trabajo: referencia lo ya facturado.
        detalle_trabajo_id: null,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        afectacion: l.afectacion,
      })),
      p_observaciones: datos.observaciones || undefined,
      p_documento_ref: datos.documentoRefId,
      p_motivo: datos.motivo,
    });

    if (error) return { ok: false, mensaje: error.message };

    refrescarDinero();
    return {
      ok: true,
      mensaje:
        datos.tipo === "nota_credito"
          ? "Nota de crédito emitida. La deuda del documento bajó."
          : "Nota de débito emitida. La deuda del documento subió.",
      documentoId: data as string,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Anotar el resultado de la declaración electrónica.
 *
 * Hoy lo teclea Administración; cuando llegue el PSE, será la integración
 * quien llame a la misma función de la base. La firma no cambia.
 */
export async function registrarCpe(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador", "gerencia", "recepcion");

    const estadoCpe = String(formData.get("estadoCpe") ?? "no_aplica");
    const respuesta = String(formData.get("respuesta") ?? "").trim();

    if (estadoCpe === "rechazado" && respuesta.length < 5) {
      return {
        ok: false,
        mensaje: "Un rechazo sin motivo no se puede corregir ni reenviar.",
      };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase.rpc("registrar_cpe", {
      p_documento: String(formData.get("documentoId")),
      p_estado: estadoCpe,
      p_hash: String(formData.get("hash") ?? "") || undefined,
      p_ticket: String(formData.get("ticket") ?? "") || undefined,
      p_respuesta: respuesta || undefined,
    });

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/facturacion");
    return { ok: true, mensaje: "Estado del comprobante actualizado." };
  } catch (e) {
    return comoMensaje(e);
  }
}
