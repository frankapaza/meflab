import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { BotonActivoDoctor } from "./boton-activo";
import { DialogoDoctor, type DoctorEditable, type OpcionCliente } from "./dialogo-doctor";

export const metadata = { title: "Doctores · MEFLAB" };

type Fila = {
  id: string;
  cliente_id: string;
  nombre: string;
  colegiatura: string | null;
  especialidad: string | null;
  email: string | null;
  telefono: string | null;
  sede_entrega: string | null;
  activo: boolean;
  cliente: { razon_social: string; tipo: string; bloqueado: boolean } | null;
};

export default async function DoctoresPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: doctores }, { data: clientes }] = await Promise.all([
    supabase
      .from("doctor")
      .select(
        "id, cliente_id, nombre, colegiatura, especialidad, email, telefono, sede_entrega, activo, cliente:cliente_id(razon_social, tipo, bloqueado)",
      )
      .order("nombre"),
    supabase
      .from("cliente")
      .select("id, razon_social, tipo")
      .eq("bloqueado", false)
      .order("razon_social"),
  ]);

  const filas = (doctores ?? []) as unknown as Fila[];
  const opciones = (clientes ?? []) as OpcionCliente[];
  const puedeEditar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));

  const activos = filas.filter((d) => d.activo).length;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Comercial
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Doctores</h1>
        </div>

        {puedeEditar ? (
          <DialogoDoctor clientes={opciones}>
            <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
              Nuevo doctor
            </button>
          </DialogoDoctor>
        ) : null}
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-01
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El doctor es quien <b className="font-semibold text-ink">pide el trabajo</b>;
          el cliente es a quien se factura. Al registrar un doctor por su cuenta,
          MEFLAB le crea su cliente en la misma operación: sin sujeto comercial
          no hay comprobante.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Doctores registrados
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {activos} {activos === 1 ? "activo" : "activos"}
            {filas.length > activos
              ? ` · ${filas.length - activos} ${filas.length - activos === 1 ? "inactivo" : "inactivos"}`
              : ""}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-s6">
            <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Aún no hay doctores
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                Sin doctores no se puede registrar una orden: la orden nace de
                quien la pide. Empieza por aquí.
              </p>
              {puedeEditar ? (
                <DialogoDoctor clientes={opciones}>
                  <button className="mt-s1 h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on">
                    Registrar el primero
                  </button>
                </DialogoDoctor>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Doctor</th>
                  <th className="px-pad-x py-s2 font-medium">Se factura a</th>
                  <th className="px-pad-x py-s2 font-medium">Especialidad</th>
                  <th className="px-pad-x py-s2 font-medium">Contacto</th>
                  <th className="px-pad-x py-s2 font-medium">Estado</th>
                  {puedeEditar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((d) => {
                  const editable: DoctorEditable = {
                    id: d.id,
                    clienteId: d.cliente_id,
                    nombre: d.nombre,
                    colegiatura: d.colegiatura,
                    especialidad: d.especialidad,
                    email: d.email,
                    telefono: d.telefono,
                    sedeEntrega: d.sede_entrega,
                    cliente: d.cliente?.razon_social ?? "—",
                  };

                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-line last:border-0 ${d.activo ? "" : "opacity-60"}`}
                    >
                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-base font-medium">{d.nombre}</span>
                          <span className="truncate font-mono text-xs text-ink-3">
                            {d.colegiatura ?? "sin colegiatura"}
                            {d.sede_entrega ? ` · entrega en ${d.sede_entrega}` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-pad-x py-s3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-ink-2">
                            {d.cliente?.razon_social ?? "—"}
                          </span>
                          {/* La deuda es del cliente, no del doctor: un doctor
                              de una clínica bloqueada tampoco puede pedir. */}
                          {d.cliente?.bloqueado ? (
                            <span className="font-mono text-xs font-semibold text-err">
                              su cliente está bloqueado
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-ink-3">
                              {d.cliente?.tipo === "clinica" ? "clínica" : "por su cuenta"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        {d.especialidad ?? <span className="text-ink-3">—</span>}
                      </td>

                      <td className="px-pad-x py-s3 text-sm text-ink-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-mono text-sm tabular-nums">
                            {d.telefono ?? "—"}
                          </span>
                          {d.email ? (
                            <span className="truncate text-xs text-ink-3">{d.email}</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-pad-x py-s3">
                        {d.activo ? (
                          <span className="rounded-r1 bg-ok-bg px-s2 py-[3px] font-mono text-xs font-semibold text-ok">
                            ACTIVO
                          </span>
                        ) : (
                          <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-3">
                            INACTIVO
                          </span>
                        )}
                      </td>

                      {puedeEditar ? (
                        <td className="px-pad-x py-s3">
                          <div className="flex justify-end gap-s2">
                            <DialogoDoctor doctor={editable} clientes={opciones}>
                              <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                                Editar
                              </button>
                            </DialogoDoctor>
                            <BotonActivoDoctor
                              doctorId={d.id}
                              activo={d.activo}
                              nombre={d.nombre}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* La ficha 360° del doctor —su historial, sus trabajos, sus reclamos—
          es la historia 18. Necesita órdenes que enseñar, y las órdenes son
          la historia 5. Enlazar ahora a una pantalla vacía sería peor. */}
      <p className="text-sm text-ink-3">
        La ficha 360° de cada doctor llega cuando existan órdenes que enseñar.
      </p>
    </div>
  );
}
