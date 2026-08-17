"use server";

import { revalidatePath } from "next/cache";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaDeAdjunto, validarArchivo } from "@/lib/validaciones/archivo";

export type Resultado = { ok: boolean; mensaje: string | null };

function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

/**
 * Sube un adjunto de la orden.
 *
 * Pasa por el servidor y no directo a Storage desde el navegador para que
 * la fila de `archivo` y el objeto se creen juntos: un objeto sin fila es
 * un archivo que nadie encuentra, y una fila sin objeto es un enlace roto
 * en la ficha de la orden.
 */
export async function subirAdjunto(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("recepcion", "administrador", "lider_laboratorio");

    const ordenId = String(formData.get("ordenId"));
    const archivo = formData.get("archivo");

    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, mensaje: "Elige un archivo." };
    }

    const revision = validarArchivo(archivo.name, archivo.size);
    if (!revision.ok) return { ok: false, mensaje: revision.motivo! };

    const supabase = await crearClienteServidor();

    // El id se genera antes para poder usarlo en la ruta: así el nombre
    // dentro del bucket nunca choca aunque suban dos "foto.jpg".
    const id = crypto.randomUUID();
    const ruta = rutaDeAdjunto(ctx.tenantId, ordenId, archivo.name, id);

    const { error: errorSubida } = await supabase.storage
      .from("adjuntos")
      .upload(ruta, archivo, {
        contentType: archivo.type || "application/octet-stream",
        upsert: false,
      });

    if (errorSubida) {
      if (errorSubida.message.toLowerCase().includes("mime")) {
        return {
          ok: false,
          mensaje: "Ese tipo de archivo no está permitido en el bucket.",
        };
      }
      return { ok: false, mensaje: errorSubida.message };
    }

    const { error } = await supabase.from("archivo").insert({
      id,
      tenant_id: ctx.tenantId,
      orden_id: ordenId,
      bucket: "adjuntos",
      ruta,
      nombre: archivo.name,
      tipo_mime: archivo.type || null,
      bytes: archivo.size,
      subido_por: ctx.usuarioId,
    });

    if (error) {
      // Si la fila no entra, el objeto sobra: se retira para no dejar
      // basura invisible en el bucket.
      await supabase.storage.from("adjuntos").remove([ruta]);
      return { ok: false, mensaje: error.message };
    }

    revalidatePath(`/trabajos/${ordenId}`);
    return { ok: true, mensaje: `${archivo.name} adjuntado.` };
  } catch (e) {
    return comoMensaje(e);
  }
}

/** Borrar un adjunto es perder la prueba de lo que pidió el doctor. */
export async function borrarAdjunto(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    await exigirRol("administrador");

    const archivoId = String(formData.get("archivoId"));
    const ordenId = String(formData.get("ordenId"));

    const supabase = await crearClienteServidor();

    const { data: fila } = await supabase
      .from("archivo")
      .select("ruta")
      .eq("id", archivoId)
      .maybeSingle();

    if (!fila) return { ok: false, mensaje: "Ese adjunto ya no existe." };

    // Primero el objeto: si se borrara antes la fila y fallara el objeto,
    // quedaría un archivo huérfano que nadie sabría que está ahí.
    const { error: errorObjeto } = await supabase.storage
      .from("adjuntos")
      .remove([fila.ruta]);
    if (errorObjeto) return { ok: false, mensaje: errorObjeto.message };

    const { error } = await supabase.from("archivo").delete().eq("id", archivoId);
    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(`/trabajos/${ordenId}`);
    return { ok: true, mensaje: "Adjunto eliminado." };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * URL firmada y de vida corta.
 *
 * El bucket es privado a propósito: un adjunto lleva el nombre del
 * paciente y a veces su boca. No puede estar tras una URL adivinable ni
 * tras un enlace que siga vivo cuando la persona ya no tiene acceso.
 */
export async function enlaceFirmado(ruta: string): Promise<string | null> {
  await exigirRol(
    "recepcion",
    "administrador",
    "lider_laboratorio",
    "lider_area",
    "tecnico",
    "gerencia",
  );

  const supabase = await crearClienteServidor();
  const { data } = await supabase.storage.from("adjuntos").createSignedUrl(ruta, 300);
  return data?.signedUrl ?? null;
}
