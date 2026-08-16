import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { iniciales } from "@/lib/auth/navegacion";
import { crearClienteServidor } from "@/lib/supabase/server";
import { exigeMfa } from "@/lib/validaciones/usuario";

import { DialogoUsuario, type UsuarioEditable } from "./dialogo-usuario";
import { BotonActivo } from "./boton-activo";

export const metadata = { title: "Usuarios y permisos · MEFLAB" };

export default async function UsuariosPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  // Tercera barrera aparte: aunque proxy.ts ya filtró, la página no se
  // fía. Un rewrite mal configurado no debe destapar la lista.
  if (!ctx.roles.includes("administrador")) redirect("/sin-acceso");

  const supabase = await crearClienteServidor();

  // Pasa por RLS: sólo devuelve las cuentas del propio laboratorio.
  const { data: usuarios } = await supabase
    .from("usuario")
    .select("id, nombre, email, telefono, activo, created_at, area:area_id(nombre), usuario_rol(rol)")
    .order("nombre");

  const filas = (usuarios ?? []).map((u) => {
    const roles = (u.usuario_rol ?? []).map((r) => r.rol as string);
    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono,
      activo: u.activo,
      area: (u.area as { nombre?: string } | null)?.nombre ?? "—",
      roles,
      esYo: u.id === ctx.usuarioId,
    };
  });

  const conDobleRol = filas.filter((f) => f.roles.length > 1).length;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Configuración
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios y permisos</h1>
        </div>

        <DialogoUsuario>
          <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
            Nuevo usuario
          </button>
        </DialogoUsuario>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          AC-01 §7.2
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Una cuenta puede tener <b className="font-semibold text-ink">varios roles</b> y
          sus permisos son la <b className="font-semibold text-ink">unión</b> de todos.
          Así Recepción cubre facturación, caja y cobranza sin inventar roles
          compuestos, y cuando el laboratorio contrate a un cajero basta con
          quitarle ese rol.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Cuentas
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {filas.length} {filas.length === 1 ? "cuenta" : "cuentas"}
            {conDobleRol > 0 ? ` · ${conDobleRol} con varios roles` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                <th className="px-pad-x py-s2 font-medium">Usuario</th>
                <th className="px-pad-x py-s2 font-medium">Roles</th>
                <th className="px-pad-x py-s2 font-medium">Área</th>
                <th className="px-pad-x py-s2 font-medium">MFA</th>
                <th className="px-pad-x py-s2 font-medium">Estado</th>
                <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const editable: UsuarioEditable = {
                  id: f.id,
                  nombre: f.nombre,
                  email: f.email,
                  telefono: f.telefono,
                  roles: f.roles,
                };
                return (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="px-pad-x py-s3">
                      <div className="flex items-center gap-s3">
                        <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-line bg-fill text-xs font-semibold text-ink-2">
                          {iniciales(f.nombre)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-medium">
                            {f.nombre}
                            {f.esYo ? (
                              <span className="ml-s2 font-mono text-xs font-normal text-ink-3">
                                (tú)
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate font-mono text-xs text-ink-3">
                            {f.email}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="px-pad-x py-s3">
                      <div className="flex flex-wrap items-center gap-s1">
                        {f.roles.length === 0 ? (
                          <span className="rounded-r1 bg-warn-bg px-s2 py-[3px] font-mono text-xs font-semibold text-warn">
                            SIN ROL
                          </span>
                        ) : (
                          f.roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2"
                            >
                              {r}
                            </span>
                          ))
                        )}
                        {f.roles.length > 1 ? (
                          <span
                            title="Sus permisos son la unión de todos sus roles"
                            className="rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-xs font-semibold text-acc"
                          >
                            ×{f.roles.length}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-pad-x py-s3 font-mono text-sm text-ink-2">{f.area}</td>

                    <td className="px-pad-x py-s3">
                      {exigeMfa(f.roles) ? (
                        <span className="font-mono text-xs font-semibold text-warn">
                          OBLIGATORIO
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-3">—</span>
                      )}
                    </td>

                    <td className="px-pad-x py-s3">
                      <span
                        className={
                          f.activo
                            ? "rounded-r1 bg-ok-bg px-s2 py-[3px] font-mono text-xs font-semibold text-ok"
                            : "rounded-r1 bg-err-bg px-s2 py-[3px] font-mono text-xs font-semibold text-err"
                        }
                      >
                        {f.activo ? "ACTIVO" : "DESACTIVADO"}
                      </span>
                    </td>

                    <td className="px-pad-x py-s3">
                      <div className="flex justify-end gap-s2">
                        <DialogoUsuario usuario={editable}>
                          <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                            Editar
                          </button>
                        </DialogoUsuario>
                        <BotonActivo
                          usuarioId={f.id}
                          activo={f.activo}
                          esYo={f.esYo}
                          nombre={f.nombre}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-s3 border-t border-line bg-card-2 px-pad-x py-s3">
          <p className="text-sm text-ink-2">
            Las cuentas no se borran, se desactivan: borrarlas se llevaría por
            delante su rastro en la auditoría y en el historial de tareas.
          </p>
        </div>
      </div>

      <p className="text-sm text-ink-3">
        Un cambio de roles se aplica en el siguiente inicio de sesión, cuando se
        emite un token nuevo. El token vive 1 hora.
      </p>
    </div>
  );
}
