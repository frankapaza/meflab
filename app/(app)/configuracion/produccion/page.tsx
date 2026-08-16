import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { horasDelFlujo, horasLegibles } from "@/lib/validaciones/produccion";

import { BotonActivoProceso } from "./boton-activo";
import {
  DialogoFlujo,
  DialogoProceso,
  type FlujoEditable,
  type ProcesoEditable,
} from "./dialogos";

export const metadata = { title: "Procesos y flujos · MEFLAB" };

type Proceso = {
  id: string;
  codigo: string;
  nombre: string;
  horas_estimadas: number;
  activo: boolean;
  flujo_etapa: { count: number }[];
};

type Flujo = {
  id: string;
  nombre: string;
  activo: boolean;
  servicio: { count: number }[];
};

type Etapa = {
  flujo_id: string;
  orden: number;
  proceso: { codigo: string; horas_estimadas: number } | null;
};

export default async function ProduccionPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: procesos }, { data: flujos }, { data: etapas }] = await Promise.all([
    supabase
      .from("proceso")
      .select("id, codigo, nombre, horas_estimadas, activo, flujo_etapa(count)")
      .order("codigo"),
    supabase
      .from("flujo_produccion")
      .select("id, nombre, activo, servicio(count)")
      .order("nombre"),
    supabase
      .from("flujo_etapa")
      .select("flujo_id, orden, proceso:proceso_id(codigo, horas_estimadas)")
      .order("orden"),
  ]);

  const listaProcesos = (procesos ?? []) as unknown as Proceso[];
  const listaFlujos = (flujos ?? []) as unknown as Flujo[];
  const listaEtapas = (etapas ?? []) as unknown as Etapa[];

  // Se agrupan aquí y no con una consulta por flujo: son pocas filas y una
  // consulta por fila multiplicaría los viajes a la base sin ganar nada.
  const porFlujo = new Map<string, Etapa[]>();
  for (const e of listaEtapas) {
    porFlujo.set(e.flujo_id, [...(porFlujo.get(e.flujo_id) ?? []), e]);
  }

  const puedeEditar = ctx.roles.includes("administrador");
  const sinEtapas = listaFlujos.filter((f) => (porFlujo.get(f.id) ?? []).length === 0);

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Configuración
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Procesos y flujos</h1>
        </div>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-04
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          El <b className="font-semibold text-ink">proceso</b> es un paso del
          taller. El <b className="font-semibold text-ink">flujo</b> es la
          receta de un tipo de trabajo: qué pasos lleva y en qué orden. Al
          registrar una orden, el flujo del servicio se copia como tareas
          concretas — es lo que llena el tablero y lo que hace medibles los
          tiempos.
        </p>
      </div>

      {sinEtapas.length > 0 ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm leading-relaxed text-warn">
          <b className="font-semibold">
            {sinEtapas.length === 1
              ? "Un flujo no tiene etapas"
              : `${sinEtapas.length} flujos no tienen etapas`}
          </b>{" "}
          ({sinEtapas.map((f) => f.nombre).join(", ")}). Las órdenes que los usen
          entrarán en producción sin ninguna tarea.
        </p>
      ) : null}

      {/* ── flujos ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Flujos de producción
          </h2>
          {puedeEditar ? (
            <DialogoFlujo>
              <button className="h-[30px] rounded-r1 bg-acc px-s3 text-sm font-semibold text-acc-on">
                Nuevo flujo
              </button>
            </DialogoFlujo>
          ) : null}
        </div>

        {listaFlujos.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            Aún no hay flujos. Un servicio sin flujo entra en producción sin
            nada que hacer.
          </p>
        ) : (
          <ul className="flex flex-col">
            {listaFlujos.map((f) => {
              const suyas = porFlujo.get(f.id) ?? [];
              const horas = horasDelFlujo(
                suyas.map((e) => Number(e.proceso?.horas_estimadas ?? 0)),
              );
              const servicios = f.servicio?.[0]?.count ?? 0;
              const editable: FlujoEditable = {
                id: f.id,
                nombre: f.nombre,
                activo: f.activo,
              };

              return (
                <li
                  key={f.id}
                  className={`flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0 ${f.activo ? "" : "opacity-60"}`}
                >
                  <div className="flex min-w-[260px] flex-1 flex-col gap-s1">
                    <div className="flex flex-wrap items-center gap-s2">
                      <Link
                        href={`/configuracion/produccion/${f.id}`}
                        className="text-base font-medium hover:text-acc"
                      >
                        {f.nombre}
                      </Link>
                      {suyas.length === 0 ? (
                        <span className="rounded-r1 bg-warn-bg px-s2 py-[2px] font-mono text-xs font-semibold text-warn">
                          SIN ETAPAS
                        </span>
                      ) : null}
                    </div>

                    {/* La secuencia en una línea: es lo que hace reconocible
                        un flujo de un vistazo, más que su nombre. */}
                    <span className="truncate font-mono text-xs text-ink-3">
                      {suyas.length === 0
                        ? "ninguna etapa definida"
                        : suyas.map((e) => e.proceso?.codigo ?? "?").join(" → ")}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-mono text-sm tabular-nums text-ink-2">
                      {horasLegibles(horas)}
                    </span>
                    <span className="font-mono text-xs text-ink-3">
                      {servicios} {servicios === 1 ? "servicio" : "servicios"}
                    </span>
                  </div>

                  <div className="flex shrink-0 gap-s2">
                    <Link
                      href={`/configuracion/produccion/${f.id}`}
                      className="grid h-[30px] place-items-center rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill"
                    >
                      Etapas
                    </Link>
                    {puedeEditar ? (
                      <DialogoFlujo flujo={editable}>
                        <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                          Renombrar
                        </button>
                      </DialogoFlujo>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── procesos ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Procesos del taller
          </h2>
          {puedeEditar ? (
            <DialogoProceso>
              <button className="h-[30px] rounded-r1 bg-acc px-s3 text-sm font-semibold text-acc-on">
                Nuevo proceso
              </button>
            </DialogoProceso>
          ) : null}
        </div>

        {listaProcesos.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            Aún no hay procesos. Son los pasos con los que se arman los flujos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-pad-x py-s2 font-medium">Código</th>
                  <th className="px-pad-x py-s2 font-medium">Proceso</th>
                  <th className="px-pad-x py-s2 text-right font-medium">Estimado</th>
                  <th className="px-pad-x py-s2 text-right font-medium">En flujos</th>
                  {puedeEditar ? (
                    <th className="px-pad-x py-s2 text-right font-medium">Acciones</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {listaProcesos.map((p) => {
                  const enFlujos = p.flujo_etapa?.[0]?.count ?? 0;
                  const editable: ProcesoEditable = {
                    id: p.id,
                    codigo: p.codigo,
                    nombre: p.nombre,
                    horasEstimadas: Number(p.horas_estimadas),
                    activo: p.activo,
                  };

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-line last:border-0 ${p.activo ? "" : "opacity-60"}`}
                    >
                      <td className="px-pad-x py-s3 font-mono text-sm text-ink-2">
                        {p.codigo}
                      </td>
                      <td className="px-pad-x py-s3 text-base">
                        {p.nombre}
                        {!p.activo ? (
                          <span className="ml-s2 font-mono text-xs uppercase text-ink-3">
                            retirado
                          </span>
                        ) : null}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                        {horasLegibles(Number(p.horas_estimadas))}
                      </td>
                      <td className="px-pad-x py-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                        {enFlujos}
                      </td>
                      {puedeEditar ? (
                        <td className="px-pad-x py-s3">
                          <div className="flex justify-end gap-s2">
                            <DialogoProceso proceso={editable}>
                              <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill">
                                Editar
                              </button>
                            </DialogoProceso>
                            <BotonActivoProceso
                              procesoId={p.id}
                              activo={p.activo}
                              nombre={p.nombre}
                              enFlujos={enFlujos}
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
    </div>
  );
}
