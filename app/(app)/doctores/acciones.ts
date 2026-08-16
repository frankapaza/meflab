"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { doctorSchema } from "@/lib/validaciones/doctor";
import { normalizarDocumento } from "@/lib/validaciones/documento";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/doctores";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function guardarDoctor(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = doctorSchema.parse({
      ...crudo,
      doctorId: crudo.doctorId || undefined,
      lineaCredito: crudo.lineaCredito || undefined,
    });

    const supabase = await crearClienteServidor();

    // ── edición: nunca cambia de cliente por aquí ─────────────────────
    // Mover un doctor de una clínica a otra arrastra su historial de
    // facturación, así que es otra operación distinta y consciente.
    if (datos.doctorId) {
      const { error } = await supabase
        .from("doctor")
        .update({
          nombre: datos.nombre,
          colegiatura: datos.colegiatura || null,
          especialidad: datos.especialidad || null,
          email: datos.email || null,
          telefono: datos.telefono || null,
          sede_entrega: datos.sedeEntrega || null,
        })
        .eq("id", datos.doctorId);

      if (error) return { ok: false, mensaje: error.message };

      revalidatePath(RUTA);
      return { ok: true, mensaje: "Doctor actualizado." };
    }

    // ── alta dentro de una clínica que ya existe ──────────────────────
    if (datos.vinculo === "clinica") {
      const { error } = await supabase.from("doctor").insert({
        tenant_id: ctx.tenantId,
        cliente_id: datos.clienteId,
        nombre: datos.nombre,
        colegiatura: datos.colegiatura || null,
        especialidad: datos.especialidad || null,
        email: datos.email || null,
        telefono: datos.telefono || null,
        sede_entrega: datos.sedeEntrega || null,
        created_by: ctx.usuarioId,
      });

      if (error) return { ok: false, mensaje: error.message };

      revalidatePath(RUTA);
      return { ok: true, mensaje: `${datos.nombre} registrado.` };
    }

    // ── alta de doctor independiente ──────────────────────────────────
    // Una sola llamada, porque la función crea cliente y doctor DENTRO de
    // la misma transacción (D-01). Hacerlo con dos inserts desde aquí
    // dejaría un cliente fantasma si el segundo falla.
    const { error } = await supabase.rpc("registrar_doctor_independiente", {
      p_nombre: datos.nombre,
      p_tipo_documento: datos.tipoDocumento,
      p_numero_documento: normalizarDocumento(datos.tipoDocumento, datos.numeroDocumento),
      // Los opcionales van como undefined, no null: así la función aplica
      // su propio default en lugar de escribir un null explícito.
      p_colegiatura: datos.colegiatura || undefined,
      p_especialidad: datos.especialidad || undefined,
      p_email: datos.email || undefined,
      p_telefono: datos.telefono || undefined,
      p_sede_entrega: datos.sedeEntrega || undefined,
      p_dias_credito: datos.diasCredito,
      p_linea_credito: datos.lineaCredito,
    });

    if (error) {
      if (error.message.includes("cliente_tenant_id_tipo_documento")) {
        return { ok: false, mensaje: "Ya existe un cliente con ese documento." };
      }
      if (error.message.includes("documento_valido")) {
        return { ok: false, mensaje: "El documento no es válido." };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    revalidatePath("/clientes");
    return {
      ok: true,
      mensaje: `${datos.nombre} registrado, con su cliente creado automáticamente.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/** Desactiva o reactiva. No se borra: arrastraría su historial de órdenes. */
export async function alternarActivoDoctor(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador");

    const doctorId = String(formData.get("doctorId"));
    const activar = formData.get("activar") === "1";

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("doctor")
      .update({ activo: activar })
      .eq("id", doctorId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: activar
        ? "Doctor reactivado."
        : "Doctor desactivado. No aparecerá al registrar órdenes nuevas.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
