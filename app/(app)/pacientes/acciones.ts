"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { normalizarDocumento } from "@/lib/validaciones/documento";
import { pacienteSchema } from "@/lib/validaciones/paciente";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/pacientes";

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof ZodError) {
    return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
  }
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

export async function guardarPaciente(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador");

    const crudo = Object.fromEntries(formData.entries());
    const datos = pacienteSchema.parse({
      ...crudo,
      pacienteId: crudo.pacienteId || undefined,
    });

    const completa = datos.ficha === "completa";

    const fila = {
      tenant_id: ctx.tenantId,
      nombre: datos.nombre,
      simplificado: !completa,
      // Al pasar de completa a simplificada se limpian los datos, no se
      // dejan de mostrar: media ficha guardada es peor que ninguna.
      tipo_documento: completa ? datos.tipoDocumento : null,
      numero_documento: completa
        ? normalizarDocumento(datos.tipoDocumento, datos.numeroDocumento)
        : null,
      fecha_nacimiento: completa ? datos.fechaNacimiento || null : null,
    };

    const supabase = await crearClienteServidor();

    const { error } = datos.pacienteId
      ? await supabase.from("paciente").update(fila).eq("id", datos.pacienteId)
      : await supabase.from("paciente").insert({ ...fila, created_by: ctx.usuarioId });

    if (error) {
      // Las mismas reglas que la base defiende, dichas en castellano.
      if (error.message.includes("paciente_documento_valido")) {
        return { ok: false, mensaje: "El documento no es válido." };
      }
      if (error.message.includes("paciente_completo_tiene_documento")) {
        return {
          ok: false,
          mensaje: "Una ficha completa necesita documento. Si no lo tienes, márcala como simplificada.",
        };
      }
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: datos.pacienteId ? "Paciente actualizado." : `${datos.nombre} registrado.`,
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
