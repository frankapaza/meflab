import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { DialogoPaciente, type PacienteEditable } from "./dialogo-paciente";

export const metadata = { title: "Pacientes · MEFLAB" };

type Fila = {
  id: string;
  nombre: string;
  simplificado: boolean;
  tipo_documento: string | null;
  numero_documento: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  ve_datos_sensibles: boolean;
};

export default async function PacientesPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  // Se lee de la VISTA, no de la tabla. La vista tapa documento y edad
  // para quien no debe verlos, y lo hace en la base: consultar `paciente`
  // directamente desde aquí volvería a destaparlos.
  const { data } = await supabase
    .from("v_paciente")
    .select(
      "id, nombre, simplificado, tipo_documento, numero_documento, fecha_nacimiento, edad, ve_datos_sensibles",
    )
    .order("nombre");

  const filas = (data ?? []) as Fila[];
  const puedeEditar = ctx.roles.some((r) => ["recepcion", "administrador"].includes(r));
  const veDatos = filas[0]?.ve_datos_sensibles ?? puedeEditar;
  const simplificados = filas.filter((p) => p.simplificado).length;

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Comercial
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        </div>

        {puedeEditar ? (
          <DialogoPaciente>
            <button className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110">
              Nuevo paciente
            </button>
          </DialogoPaciente>
        ) : null}
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          RN-02
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El paciente admite <b className="font-semibold text-ink">ficha simplificada</b>:
          sólo el nombre. Es el caso normal en el mostrador, y evita que la
          orden se quede sin registrar por un dato que el doctor no mandó.
          Su documento y su edad sólo los ven Recepción, Administrador y
          Gerencia.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Pacientes registrados
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {filas.length} {filas.length === 1 ? "paciente" : "pacientes"}
            {simplificados > 0 ? ` · ${simplificados} con ficha simplificada` : ""}
          </span>
        </div>

        {filas.length === 0 ? (
          <div className="grid min-h-[280px] place-items-center p-s6">
            <div className="flex max-w-[440px] flex-col items-center gap-s3 text-center">
              <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
                ○
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Aún no hay pacientes
              </h3>
              <p className="text-base leading-relaxed text-ink-2">
                Se registran al crear la primera orden, o por adelantado desde
                aquí. Se admite paciente simplificado.
              </p>
              {puedeEditar ? (
                <DialogoPaciente>
                  <button className="mt-s1 h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on">
                    Registrar paciente
                  </button>
                </DialogoPaciente>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Paciente</th>
                  <th className="px-pad-x py-s2 font-medium">Ficha</th>
                  <th className="px-pad-x py-s2 font-medium">Documento</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Edad</th>
                  {puedeEditar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => {
                  const editable: PacienteEditable = {
                    id: p.id,
                    nombre: p.nombre,
                    simplificado: p.simplificado,
                    tipoDocumento: p.tipo_documento,
                    numeroDocumento: p.numero_documento,
                    fechaNacimiento: p.fecha_nacimiento,
                  };

                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-pad-x py-s3">
                        <span className="truncate text-base font-medium">{p.nombre}</span>
                      </td>

                      <td className="px-pad-x py-s3">
                        {p.simplificado ? (
                          <span className="rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2">
                            SIMPLIFICADA
                          </span>
                        ) : (
                          <span className="rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-xs font-semibold text-acc">
                            COMPLETA
                          </span>
                        )}
                      </td>

                      {/* Un hueco parece un dato que falta. Cuando el dato
                          existe pero no toca verlo, se dice. */}
                      <td className="px-pad-x py-s3 font-mono text-sm tabular-nums text-ink-2">
                        {!p.ve_datos_sensibles ? (
                          <span className="text-ink-3">restringido</span>
                        ) : p.numero_documento ? (
                          `${p.tipo_documento} ${p.numero_documento}`
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>

                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                        {!p.ve_datos_sensibles ? (
                          <span className="text-ink-3">·</span>
                        ) : p.edad !== null ? (
                          `${p.edad}`
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>

                      {puedeEditar ? (
                        <td className="px-pad-x py-s3 text-right">
                          <DialogoPaciente paciente={editable}>
                            <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                              Editar
                            </button>
                          </DialogoPaciente>
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

      {/* El doctor habitual, el número de trabajos y la última visita salen
          de orden_trabajo, que se llena en la historia 8. Inventar esas
          columnas ahora sería enseñar ceros que parecen datos. */}
      <p className="text-sm text-ink-3">
        {veDatos
          ? "El doctor habitual y el historial de trabajos de cada paciente aparecen cuando existan órdenes."
          : "Tu rol ve el nombre del paciente y el trabajo asociado. El documento y la edad quedan restringidos."}
      </p>
    </div>
  );
}
