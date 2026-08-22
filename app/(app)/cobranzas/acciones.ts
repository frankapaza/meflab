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
 * M-04 · Registrar una gestión de cobranza.
 *
 * Una gestión es una llamada, un correo o una visita. Se registra SIEMPRE,
 * también cuando no contestan: «llamé tres veces y no contestan» sólo es
 * un argumento si las tres llamadas están escritas. Sin registro, la
 * cobranza depende de la memoria de quien llamó.
 *
 * Si el resultado es una promesa de pago, nace además la promesa con su
 * fecha. Las dos cosas van en la misma operación: una promesa sin la
 * gestión que la originó no se puede explicar.
 */
const gestionSchema = z
  .object({
    clienteId: z.string().uuid("Elige el cliente al que se gestiona."),
    cuentaCobrarId: z.string().uuid().optional().or(z.literal("")),
    canal: z.enum(["telefono", "whatsapp", "email", "visita", "otro"]),
    resultado: z.enum([
      "promesa_pago",
      "sin_respuesta",
      "volver_a_llamar",
      "reclamo",
      "pagado",
      "negativa",
    ]),
    notas: z.string().trim().max(1000).optional().or(z.literal("")),
    fechaPromesa: z.string().optional().or(z.literal("")),
    importePromesa: z.coerce.number().optional(),
  })
  .refine(
    (d) =>
      d.resultado !== "promesa_pago" ||
      (Boolean(d.fechaPromesa) && Number(d.importePromesa) > 0),
    {
      // Una «promesa» sin fecha ni importe no es una promesa: es una
      // conversación. Y no se puede hacer seguimiento de una conversación.
      message: "Una promesa de pago necesita fecha e importe.",
      path: ["fechaPromesa"],
    },
  );

export async function registrarGestion(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador", "gerencia");

    const datos = gestionSchema.parse({
      clienteId: formData.get("clienteId") ?? "",
      cuentaCobrarId: formData.get("cuentaCobrarId") ?? "",
      canal: formData.get("canal") ?? "telefono",
      resultado: formData.get("resultado") ?? "sin_respuesta",
      notas: formData.get("notas") ?? "",
      fechaPromesa: formData.get("fechaPromesa") ?? "",
      importePromesa: formData.get("importePromesa") || 0,
    });

    const supabase = await crearClienteServidor();

    const { data: gestion, error } = await supabase
      .from("gestion_cobranza")
      .insert({
        tenant_id: ctx.tenantId,
        cliente_id: datos.clienteId,
        cuenta_cobrar_id: datos.cuentaCobrarId || null,
        canal: datos.canal,
        resultado: datos.resultado,
        notas: datos.notas || null,
        gestionado_por: ctx.usuarioId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, mensaje: error.message };

    if (datos.resultado === "promesa_pago") {
      const { error: errorPromesa } = await supabase.from("promesa_pago").insert({
        tenant_id: ctx.tenantId,
        gestion_id: gestion.id,
        cliente_id: datos.clienteId,
        fecha_prometida: datos.fechaPromesa!,
        importe: datos.importePromesa!,
      });

      if (errorPromesa) return { ok: false, mensaje: errorPromesa.message };
    }

    revalidatePath("/cobranzas");
    return {
      ok: true,
      mensaje:
        datos.resultado === "promesa_pago"
          ? "Gestión y promesa registradas. Aparecerá en la agenda el día prometido."
          : "Gestión registrada.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Cerrar una promesa a mano.
 *
 * Lo normal es que se cumpla sola —el pago la salda— pero hay casos en
 * que el cobrador sabe algo que el sistema no: el doctor avisó de que no
 * va a pagar, o pagó por una vía que aún no está registrada.
 */
export async function cerrarPromesa(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("recepcion", "administrador", "gerencia");

    const promesaId = String(formData.get("promesaId"));
    const cumplida = formData.get("cumplida") === "1";

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("promesa_pago")
      .update({
        estado: cumplida ? "cumplida" : "incumplida",
        cumplida_en: cumplida ? new Date().toISOString() : null,
      })
      .eq("id", promesaId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath("/cobranzas");
    return {
      ok: true,
      mensaje: cumplida ? "Promesa dada por cumplida." : "Promesa marcada como incumplida.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
