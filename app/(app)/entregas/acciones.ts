"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { entregaSchema } from "@/lib/validaciones/entrega";

export type Resultado = { ok: boolean; mensaje: string | null };

export async function registrarEntrega(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador", "lider_laboratorio");

    const datos = entregaSchema.parse({
      ordenId: formData.get("ordenId") ?? "",
      receptor: formData.get("receptor") ?? "",
      metodo: formData.get("metodo") ?? "mostrador",
      observaciones: formData.get("observaciones") ?? "",
    });

    const supabase = await crearClienteServidor();

    const { error } = await supabase.from("entrega").insert({
      tenant_id: ctx.tenantId,
      orden_id: datos.ordenId,
      receptor: datos.receptor,
      metodo: datos.metodo,
      observaciones: datos.observaciones || null,
      created_by: ctx.usuarioId,
    });

    if (error) {
      // unique (orden_id): una orden se entrega una vez.
      if (error.code === "23505") {
        return { ok: false, mensaje: "Esa orden ya estaba registrada como entregada." };
      }
      return { ok: false, mensaje: error.message };
    }

    // El estado lo mueve la misma función que usa el tablero, para que la
    // orden entregada no se quede en un estado de producción — y para que
    // el cambio deje su rastro en el historial como cualquier otro.
    const { data: estadoFinal } = await supabase
      .from("estado_trabajo")
      .select("id")
      .eq("fase", "final")
      .eq("activo", true)
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (estadoFinal) {
      await supabase.rpc("cambiar_estado_orden", {
        p_orden: datos.ordenId,
        p_estado: estadoFinal.id,
      });
    }

    revalidatePath("/entregas");
    revalidatePath("/trabajos");
    return { ok: true, mensaje: `Entrega registrada a ${datos.receptor}.` };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
    if (e instanceof z.ZodError) {
      return { ok: false, mensaje: e.issues[0]?.message ?? "Revisa los datos." };
    }
    if (e instanceof Error) return { ok: false, mensaje: e.message };
    return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
  }
}
