"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteSchema } from "@/lib/validaciones/cliente";
import { soloDigitos } from "@/lib/validaciones/documento";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/clientes";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    // El primer problema, no los seis: una lista de errores abruma y la
    // gente arregla de uno en uno de todas formas.
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function guardarCliente(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // Recepción es quien registra clientes en el día a día (AC-01 §5).
    const ctx = await exigirRol("recepcion", "administrador");

    const datos = clienteSchema.parse({
      clienteId: formData.get("clienteId") || undefined,
      tipo: formData.get("tipo"),
      razonSocial: formData.get("razonSocial"),
      tipoDocumento: formData.get("tipoDocumento"),
      numeroDocumento: formData.get("numeroDocumento"),
      direccion: formData.get("direccion") ?? "",
      email: formData.get("email") ?? "",
      telefono: formData.get("telefono") ?? "",
      diasCredito: formData.get("diasCredito") ?? 0,
      lineaCredito: formData.get("lineaCredito") || undefined,
      listaPrecioId: formData.get("listaPrecioId") ?? "",
    });

    const supabase = await crearClienteServidor();

    const fila = {
      tenant_id: ctx.tenantId,
      tipo: datos.tipo as never,
      razon_social: datos.razonSocial,
      tipo_documento: datos.tipoDocumento,
      // Se guarda sin guiones ni espacios: si no, el mismo cliente puede
      // registrarse dos veces con formatos distintos.
      numero_documento: soloDigitos(datos.numeroDocumento) || datos.numeroDocumento,
      direccion: datos.direccion || null,
      email: datos.email || null,
      telefono: datos.telefono || null,
      dias_credito: datos.diasCredito,
      linea_credito: datos.lineaCredito ?? null,
      lista_precio_id: datos.listaPrecioId || null,
    };

    const { error } = datos.clienteId
      ? await supabase.from("cliente").update(fila).eq("id", datos.clienteId)
      : await supabase.from("cliente").insert({ ...fila, created_by: ctx.usuarioId });

    if (error) {
      // 23505: unique (tenant_id, tipo_documento, numero_documento)
      if (error.code === "23505") {
        return { ok: false, mensaje: "Ya existe un cliente con ese documento." };
      }
      // La base valida el RUC aunque el formulario se salte (regla 7).
      if (error.message.includes("cliente_documento_valido")) {
        return { ok: false, mensaje: "El documento no es válido." };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: datos.clienteId ? "Cliente actualizado." : `${datos.razonSocial} registrado.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Bloquea o desbloquea comercialmente.
 *
 * Bloquear NO desactiva: el cliente sigue existiendo y sus trabajos en
 * curso siguen su camino. Lo que se impide es aceptarle trabajo nuevo.
 */
export async function alternarBloqueo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // Autorizar venta sobre línea excedida es de Gerencia o Administrador
    // (AC-01 §5, permisos de aprobación). Recepción no se autoriza sola.
    await exigirRol("gerencia", "administrador");

    const clienteId = String(formData.get("clienteId"));
    const bloquear = formData.get("bloquear") === "1";
    const motivo = String(formData.get("motivo") ?? "").trim();

    if (bloquear && motivo.length < 5) {
      return { ok: false, mensaje: "Escribe el motivo del bloqueo." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("cliente")
      .update({
        bloqueado: bloquear,
        motivo_bloqueo: bloquear ? motivo : null,
      })
      .eq("id", clienteId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: bloquear
        ? "Cliente bloqueado. No se le pueden registrar trabajos nuevos."
        : "Cliente desbloqueado.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
