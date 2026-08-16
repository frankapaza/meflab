"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ordenSchema } from "@/lib/validaciones/orden";

export type Resultado = { ok: boolean; mensaje: string | null; ordenId?: string };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function registrarOrden(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador");

    const datos = ordenSchema.parse({
      clienteId: formData.get("clienteId") ?? "",
      doctorId: formData.get("doctorId") ?? "",
      pacienteId: formData.get("pacienteId") ?? "",
      fechaComprometida: formData.get("fechaComprometida") ?? "",
      prioridad: formData.get("prioridad") ?? "normal",
      tipoRecepcion: formData.get("tipoRecepcion") ?? "impresion_fisica",
      indicaciones: formData.get("indicaciones") ?? "",
      lineas: JSON.parse(String(formData.get("lineas") ?? "[]")),
    });

    const supabase = await crearClienteServidor();

    // Una sola llamada: la función crea cabecera, líneas, correlativo y
    // tareas en la misma transacción. Y resuelve el precio ella misma —
    // mandarlo desde aquí lo dejaría a merced de lo que tuviera la
    // pantalla en ese momento.
    const { data, error } = await supabase.rpc("registrar_orden", {
      p_cliente: datos.clienteId,
      p_doctor: datos.doctorId,
      p_paciente: datos.pacienteId,
      p_fecha_comprometida: datos.fechaComprometida,
      p_prioridad: datos.prioridad,
      p_tipo_recepcion: datos.tipoRecepcion,
      p_indicaciones: datos.indicaciones || undefined,
      p_lineas: datos.lineas.map((l) => ({
        servicio_id: l.servicioId,
        cantidad: l.cantidad,
        piezas_fdi: l.piezasFdi,
        color_id: l.colorId || null,
      })),
    });

    if (error) {
      if (error.message.includes("bloqueado")) {
        return {
          ok: false,
          mensaje: "El cliente está bloqueado comercialmente. No se le pueden registrar órdenes.",
        };
      }
      if (error.message.includes("no pertenece")) {
        return { ok: false, mensaje: "Ese doctor no pertenece a ese cliente." };
      }
      if (error.message.includes("estado inicial")) {
        return {
          ok: false,
          mensaje: "El laboratorio no tiene configurado un estado inicial del ciclo.",
        };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath("/trabajos");
    return { ok: true, mensaje: "Orden registrada.", ordenId: data as string };
  } catch (e) {
    return comoMensaje(e);
  }
}
