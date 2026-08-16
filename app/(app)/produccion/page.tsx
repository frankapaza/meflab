import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { horasLegibles } from "@/lib/validaciones/produccion";

import {
  SelectorEstado,
  SelectorTecnico,
  type OpcionEstado,
  type OpcionTecnico,
} from "./controles";

export const metadata = { title: "Producción · MEFLAB" };

const fechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Lima",
});

type Tarea = {
  id: string;
  orden_id: string;
  orden_etapa: number;
  estado: string;
  tecnico_id: string | null;
  horas_estimadas: number;
  proceso: { codigo: string; nombre: string } | null;
};

type Orden = {
  id: string;
  codigo: string;
  prioridad: string;
  fecha_comprometida: string;
  estado_id: string;
  cliente: { razon_social: string } | null;
  doctor: { nombre: string } | null;
};

const GLIFO_TAREA: Record<string, string> = {
  sin_asignar: "○",
  asignada: "◔",
  en_curso: "◑",
  completa: "■",
  anulada: "×",
};

export default async function ProduccionPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: ordenes }, { data: tareas }, { data: estados }, { data: usuarios }] =
    await Promise.all([
      supabase
        .from("orden_trabajo")
        .select(
          "id, codigo, prioridad, fecha_comprometida, estado_id, cliente:cliente_id(razon_social), doctor:doctor_id(nombre)",
        )
        .order("fecha_comprometida"),
      supabase
        .from("tarea_produccion")
        .select(
          "id, orden_id, orden_etapa, estado, tecnico_id, horas_estimadas, proceso:proceso_id(codigo, nombre)",
        )
        .order("orden_etapa"),
      supabase
        .from("estado_trabajo")
        .select("id, nombre, glifo, fase")
        .eq("activo", true)
        .order("orden"),
      supabase
        .from("usuario")
        .select("id, nombre, usuario_rol(rol)")
        .eq("activo", true)
        .order("nombre"),
    ]);

  const listaOrdenes = (ordenes ?? []) as unknown as Orden[];
  const listaTareas = (tareas ?? []) as unknown as Tarea[];

  const porOrden = new Map<string, Tarea[]>();
  for (const t of listaTareas) {
    porOrden.set(t.orden_id, [...(porOrden.get(t.orden_id) ?? []), t]);
  }

  // La carga de cada técnico es la suma de las horas estimadas de lo que
  // tiene sin terminar. Se calcula aquí para poder enseñarla en el propio
  // selector: comparar de memoria acaba en asignárselo siempre al mismo.
  const carga = new Map<string, number>();
  for (const t of listaTareas) {
    if (!t.tecnico_id || t.estado === "completa" || t.estado === "anulada") continue;
    carga.set(t.tecnico_id, (carga.get(t.tecnico_id) ?? 0) + Number(t.horas_estimadas));
  }

  const tecnicos: OpcionTecnico[] = (usuarios ?? [])
    .filter((u) =>
      ((u.usuario_rol ?? []) as unknown as { rol: string }[]).some((r) =>
        ["tecnico", "lider_area"].includes(r.rol),
      ),
    )
    .map((u) => ({ id: u.id, nombre: u.nombre, horas: carga.get(u.id) ?? 0 }));

  const opcionesEstado: OpcionEstado[] = (estados ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    glifo: e.glifo ?? "○",
  }));

  const puedeAsignar = ctx.roles.some((r) =>
    ["administrador", "lider_laboratorio", "lider_area"].includes(r),
  );
  const puedeMover = ctx.roles.some((r) =>
    ["administrador", "lider_laboratorio", "lider_area", "recepcion"].includes(r),
  );

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Producción
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Asignación de etapas</h1>
      </header>

      {tecnicos.length === 0 ? (
        <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
          No hay ningún usuario con rol de Técnico o Líder de Área. Sin
          técnicos no se puede asignar ninguna etapa.
        </p>
      ) : null}

      {listaOrdenes.length === 0 ? (
        <div className="grid min-h-[240px] place-items-center rounded-r2 border border-line bg-card p-s6">
          <p className="max-w-[420px] text-center text-base leading-relaxed text-ink-2">
            No hay órdenes en producción todavía.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-s4">
          {listaOrdenes.map((o) => {
            const suyas = porOrden.get(o.id) ?? [];
            const completas = suyas.filter((t) => t.estado === "completa").length;
            const vence = new Date(`${o.fecha_comprometida}T00:00:00`);
            const atrasada = vence < new Date() && completas < suyas.length;

            return (
              <li
                key={o.id}
                className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1"
              >
                <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-center gap-s2">
                      <span className="font-mono text-sm">{o.codigo}</span>
                      {o.prioridad === "urgente" ? (
                        <span className="rounded-r1 bg-err-bg px-s2 py-[2px] font-mono text-xs font-semibold text-err">
                          ▲ URGENTE
                        </span>
                      ) : null}
                    </div>
                    <span className="truncate text-sm text-ink-2">
                      {o.cliente?.razon_social} · {o.doctor?.nombre}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-s3">
                    <span
                      className={`font-mono text-sm tabular-nums ${atrasada ? "text-err" : "text-ink-2"}`}
                    >
                      <span aria-hidden="true">{atrasada ? "▲" : "●"}</span>{" "}
                      {fechaCorta.format(vence)}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-ink-2">
                      {completas}/{suyas.length}
                    </span>
                    {puedeMover ? (
                      <SelectorEstado
                        key={`${o.id}-${o.estado_id}`}
                        ordenId={o.id}
                        estadoId={o.estado_id}
                        estados={opcionesEstado}
                      />
                    ) : null}
                  </div>
                </div>

                {suyas.length === 0 ? (
                  <p className="px-pad-x py-s3 text-sm text-warn">
                    ▲ Esta orden no tiene etapas: su servicio no tenía flujo de
                    producción cuando se registró.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {suyas.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s2 last:border-0"
                      >
                        <span className="grid size-[26px] shrink-0 place-items-center rounded-r1 bg-fill font-mono text-xs tabular-nums text-ink-2">
                          {t.orden_etapa}
                        </span>

                        <span
                          aria-hidden="true"
                          className={`font-mono text-sm ${t.estado === "completa" ? "text-ok" : t.estado === "en_curso" ? "text-acc" : "text-ink-3"}`}
                        >
                          {GLIFO_TAREA[t.estado] ?? "○"}
                        </span>

                        <span className="min-w-[180px] flex-1 truncate text-base">
                          {t.proceso?.nombre ?? "—"}
                        </span>

                        <span className="shrink-0 font-mono text-xs text-ink-3">
                          {horasLegibles(Number(t.horas_estimadas))}
                        </span>

                        {/* La `key` lleva el técnico asignado a propósito:
                            React reinicia los campos de un formulario tras
                            cada acción, y sin remontar el selector volvería
                            a enseñar "Sin asignar" con la etapa ya asignada
                            en la base. */}
                        <SelectorTecnico
                          key={`${t.id}-${t.tecnico_id ?? "libre"}`}
                          tareaId={t.id}
                          tecnicoId={t.tecnico_id}
                          tecnicos={tecnicos}
                          bloqueado={
                            !puedeAsignar ||
                            t.estado === "en_curso" ||
                            t.estado === "completa"
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-ink-3">
        Una etapa ya empezada no se reasigna desde aquí: el técnico que la
        inició tiene el trabajo a medias en la mano.
      </p>
    </div>
  );
}
