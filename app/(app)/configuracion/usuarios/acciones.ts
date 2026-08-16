"use server";

import { revalidatePath } from "next/cache";

import { SinPermiso, exigirRol } from "@/lib/auth/permisos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
} from "@/lib/validaciones/usuario";

export type Resultado = { ok: boolean; mensaje: string | null };

const RUTA = "/configuracion/usuarios";

/** Convierte cualquier fallo en un mensaje que se pueda leer en pantalla. */
function comoMensaje(e: unknown): Resultado {
  if (e instanceof SinPermiso) return { ok: false, mensaje: e.message };
  if (e instanceof Error) return { ok: false, mensaje: e.message };
  return { ok: false, mensaje: "Algo falló. Inténtalo de nuevo." };
}

function rolesDe(formData: FormData): string[] {
  return formData.getAll("roles").map(String);
}

/**
 * Alta de usuario.
 *
 * Es la única operación del MVP que necesita `service_role`: crear una
 * cuenta en `auth.users` no se puede hacer con la `anon key` por diseño.
 * Por eso el permiso se comprueba ANTES de tocar nada.
 */
export async function crearUsuario(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    // Barrera 2. Sin esto, cualquiera con sesión podría invocar esta
    // acción por HTTP y crearse un administrador.
    const ctx = await exigirRol("administrador");

    const datos = crearUsuarioSchema.parse({
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      password: formData.get("password"),
      telefono: formData.get("telefono") ?? "",
      roles: rolesDe(formData),
    });

    const admin = crearClienteAdmin();

    // Se confirma el correo directamente: las cuentas las crea el
    // Administrador, no hay registro público que verificar (docs/03 §4).
    const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
      email: datos.email,
      password: datos.password,
      email_confirm: true,
    });

    if (errAuth || !creado.user) {
      return {
        ok: false,
        mensaje:
          errAuth?.message?.includes("already")
            ? "Ya existe una cuenta con ese correo."
            : `No se pudo crear la cuenta: ${errAuth?.message ?? "error desconocido"}`,
      };
    }

    // El perfil hereda el laboratorio y el área de quien lo da de alta.
    const { data: area } = await admin
      .from("area")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("es_default", true)
      .single();

    const { error: errPerfil } = await admin.from("usuario").insert({
      id: creado.user.id,
      tenant_id: ctx.tenantId,
      area_id: area?.id ?? null,
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono || null,
      created_by: ctx.usuarioId,
    });

    if (errPerfil) {
      // Sin perfil, la cuenta de Auth queda huérfana y su token saldría
      // sin tenant. Se deshace para no dejar basura.
      await admin.auth.admin.deleteUser(creado.user.id);
      return { ok: false, mensaje: `No se pudo crear el perfil: ${errPerfil.message}` };
    }

    const { error: errRoles } = await admin.from("usuario_rol").insert(
      datos.roles.map((rol) => ({
        tenant_id: ctx.tenantId,
        usuario_id: creado.user!.id,
        rol: rol as never,
        created_by: ctx.usuarioId,
      })),
    );

    if (errRoles) {
      await admin.auth.admin.deleteUser(creado.user.id);
      return { ok: false, mensaje: `No se pudieron asignar los roles: ${errRoles.message}` };
    }

    revalidatePath(RUTA);
    return { ok: true, mensaje: `${datos.nombre} ya puede entrar.` };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Cambia nombre, teléfono y roles.
 *
 * Los roles se reemplazan por completo: se borran los que había y se
 * insertan los nuevos. Es más simple que calcular diferencias y no deja
 * estados a medias si algo falla en mitad.
 */
export async function actualizarUsuario(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const datos = actualizarUsuarioSchema.parse({
      usuarioId: formData.get("usuarioId"),
      nombre: formData.get("nombre"),
      telefono: formData.get("telefono") ?? "",
      roles: rolesDe(formData),
    });

    // Nadie se quita a sí mismo el rol de administrador: dejaría el
    // laboratorio sin quien configure nada, y sin forma de arreglarlo
    // desde la propia aplicación.
    if (datos.usuarioId === ctx.usuarioId && !datos.roles.includes("administrador")) {
      return {
        ok: false,
        mensaje:
          "No puedes quitarte a ti mismo el rol de Administrador. " +
          "Dale ese rol a otra persona primero.",
      };
    }

    const supabase = await crearClienteServidor();

    // Va por RLS a propósito: aquí no hace falta service_role, así que no
    // se usa. La política ya exige rol administrador y el propio tenant.
    const { error: errPerfil } = await supabase
      .from("usuario")
      .update({ nombre: datos.nombre, telefono: datos.telefono || null })
      .eq("id", datos.usuarioId);

    if (errPerfil) return { ok: false, mensaje: errPerfil.message };

    const { error: errBorrado } = await supabase
      .from("usuario_rol")
      .delete()
      .eq("usuario_id", datos.usuarioId);

    if (errBorrado) return { ok: false, mensaje: errBorrado.message };

    const { error: errRoles } = await supabase.from("usuario_rol").insert(
      datos.roles.map((rol) => ({
        tenant_id: ctx.tenantId,
        usuario_id: datos.usuarioId,
        rol: rol as never,
        created_by: ctx.usuarioId,
      })),
    );

    if (errRoles) return { ok: false, mensaje: errRoles.message };

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: "Guardado. Los nuevos permisos se aplican en su próximo inicio de sesión.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}

/**
 * Activa o desactiva. No se borra nunca: un usuario borrado se lleva por
 * delante su rastro en la auditoría y en el historial de tareas.
 */
export async function alternarActivo(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  try {
    const ctx = await exigirRol("administrador");

    const usuarioId = String(formData.get("usuarioId"));
    const activar = formData.get("activar") === "1";

    if (usuarioId === ctx.usuarioId && !activar) {
      return { ok: false, mensaje: "No puedes desactivar tu propia cuenta." };
    }

    const supabase = await crearClienteServidor();
    const { error } = await supabase
      .from("usuario")
      .update({ activo: activar })
      .eq("id", usuarioId);

    if (error) return { ok: false, mensaje: error.message };

    revalidatePath(RUTA);
    return {
      ok: true,
      mensaje: activar
        ? "Cuenta reactivada."
        : "Cuenta desactivada. Su token saldrá sin laboratorio y no verá nada.",
    };
  } catch (e) {
    return comoMensaje(e);
  }
}
