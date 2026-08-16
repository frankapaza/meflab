"use client";

import { useActionState, useId, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AYUDA_ROL, ETIQUETA_ROL, ROLES, exigeMfa } from "@/lib/validaciones/usuario";
import { actualizarUsuario, crearUsuario, type Resultado } from "./acciones";
import { cn } from "@/lib/utils";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type UsuarioEditable = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  roles: string[];
};

export function DialogoUsuario({
  usuario,
  children,
}: {
  usuario?: UsuarioEditable;
  children: React.ReactNode;
}) {
  const editando = Boolean(usuario);
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();

  /**
   * Campos CONTROLADOS, no `defaultValue`.
   *
   * React reinicia el formulario después de ejecutar una acción. Con
   * campos no controlados, un alta fallida borra todo lo tecleado y hay
   * que empezar de cero. Se detectó probando en el diálogo de clientes.
   */
  const [campos, setCampos] = useState(() => ({
    nombre: usuario?.nombre ?? "",
    email: "",
    password: "",
    telefono: usuario?.telefono ?? "",
    roles: usuario?.roles ?? ([] as string[]),
  }));
  const set = (k: string, v: string) => setCampos((c) => ({ ...c, [k]: v }));
  const roles = campos.roles;
  const setRoles = (fn: (r: string[]) => string[]) =>
    setCampos((c) => ({ ...c, roles: fn(c.roles) }));

  // El cierre se decide DENTRO de la acción, no en un efecto que observe
  // el resultado: eso último dispara renders en cascada y React lo avisa.
  // Aquí estamos en contexto de evento, que es donde toca cambiar estado.
  //
  // Y sólo se cierra cuando la acción confirma. Si falla, el diálogo se
  // queda abierto con lo escrito: nadie quiere teclear el alta dos veces.
  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const resultado = await (editando ? actualizarUsuario : crearUsuario)(
        previo,
        formData,
      );
      if (resultado.ok) {
        setAbierto(false);
        if (!editando) {
          setCampos({ nombre: "", email: "", password: "", telefono: "", roles: [] });
        }
      }
      return resultado;
    },
    INICIAL,
  );

  const alternarRol = (rol: string) =>
    setRoles((r) => (r.includes(rol) ? r.filter((x) => x !== rol) : [...r, rol]));

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {editando ? usuario!.nombre : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            {editando
              ? "Los permisos son la unión de todos sus roles."
              : "Las cuentas las crea el Administrador. No hay registro público."}
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          {editando ? <input type="hidden" name="usuarioId" value={usuario!.id} /> : null}

          <Campo etiqueta="Nombre completo *" id={`${idForm}-nombre`}>
            <input
              id={`${idForm}-nombre`}
              name="nombre"
              required
              minLength={3}
              value={campos.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          {editando ? (
            <Campo etiqueta="Correo" id={`${idForm}-email`} ayuda="El correo no se cambia: es la identidad de la cuenta.">
              <div className="flex h-[38px] items-center rounded-r1 border border-line bg-fill px-s3 text-base text-ink-3">
                {usuario!.email}
              </div>
            </Campo>
          ) : (
            <Campo etiqueta="Correo *" id={`${idForm}-email`}>
              <input
                id={`${idForm}-email`}
                name="email"
                type="email"
                required
                value={campos.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          )}

          {!editando ? (
            <Campo
              etiqueta="Contraseña provisional *"
              id={`${idForm}-pass`}
              ayuda="Mínimo 10 caracteres. Compártela por un canal seguro y pídele que la cambie."
            >
              <input
                id={`${idForm}-pass`}
                name="password"
                type="text"
                required
                minLength={10}
                autoComplete="new-password"
                value={campos.password}
                onChange={(e) => set("password", e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          ) : null}

          <Campo etiqueta="Teléfono" id={`${idForm}-tel`}>
            <input
              id={`${idForm}-tel`}
              name="telefono"
              value={campos.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc"
            />
          </Campo>

          <fieldset className="flex flex-col gap-s2">
            <legend className="pb-s1 font-mono text-xs uppercase tracking-wide text-ink-2">
              Roles * — se pueden marcar varios
            </legend>

            <div className="flex flex-col gap-s1">
              {ROLES.map((rol) => {
                const marcado = roles.includes(rol);
                return (
                  <label
                    key={rol}
                    className={cn(
                      "flex cursor-pointer items-start gap-s3 rounded-r1 border p-s3 transition",
                      marcado
                        ? "border-acc bg-acc-bg"
                        : "border-line bg-card-2 hover:border-line-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={rol}
                      checked={marcado}
                      onChange={() => alternarRol(rol)}
                      className="mt-[2px] size-[16px] shrink-0 accent-[var(--acc)]"
                    />
                    <span className="flex min-w-0 flex-col gap-[2px]">
                      <span
                        className={cn(
                          "text-base font-medium",
                          marcado ? "text-acc" : "text-ink",
                        )}
                      >
                        {ETIQUETA_ROL[rol]}
                      </span>
                      <span className="text-sm text-ink-2">{AYUDA_ROL[rol]}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {roles.length === 0 ? (
              <p className="text-sm text-ink-3">
                Sin ningún rol, la cuenta entra pero no ve nada.
              </p>
            ) : null}

            {exigeMfa(roles) ? (
              <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
                <b className="font-semibold">MFA obligatorio.</b> Administrador y
                Gerencia son los roles con más poder del sistema: se les exige
                segundo factor en el primer inicio de sesión.
              </p>
            ) : null}

            {roles.length > 1 ? (
              <p className="text-sm text-ink-2">
                Esta cuenta tendrá <b className="font-semibold text-ink">{roles.length} roles</b>.
                Sus permisos serán la unión de todos, sin inventar un rol compuesto.
              </p>
            ) : null}
          </fieldset>

          {estado.mensaje && !estado.ok ? (
            <p
              role="alert"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
            >
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter className="gap-s2 border-t border-line pt-s4">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || roles.length === 0}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  etiqueta,
  id,
  ayuda,
  children,
}: {
  etiqueta: string;
  id: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
      {ayuda ? <span className="text-sm text-ink-3">{ayuda}</span> : null}
    </div>
  );
}
