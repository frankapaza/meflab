import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { METODOS } from "@/lib/validaciones/entrega";
import { DialogoEntrega } from "./dialogo-entrega";

export const metadata = { title: "Entregas · MEFLAB" };

const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

const fechaHora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

type Orden = {
  id: string;
  codigo: string;
  fecha_comprometida: string;
  cliente: { razon_social: string } | null;
  doctor: { nombre: string } | null;
  estado: { nombre: string; glifo: string; fase: string } | null;
  tarea_produccion: { estado: string }[];
  // Objeto, no lista: `entrega` lleva `unique (orden_id)`, así que PostgREST
  // la resuelve como relación a UNO y devuelve null cuando no la hay.
  entrega: { id: string; entregado_en: string; receptor: string; metodo: string } | null;
};

const ETIQUETA_METODO = Object.fromEntries(METODOS.map((m) => [m.valor, m.etiqueta]));

export default async function EntregasPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("orden_trabajo")
    .select(
      "id, codigo, fecha_comprometida, cliente:cliente_id(razon_social), doctor:doctor_id(nombre), estado:estado_id(nombre, glifo, fase), tarea_produccion(estado), entrega(id, entregado_en, receptor, metodo)",
    )
    .order("fecha_comprometida");

  const ordenes = (data ?? []) as unknown as Orden[];

  const entregadas = ordenes.filter((o) => o.entrega !== null);
  const pendientes = ordenes.filter((o) => o.entrega === null);

  const puedeEntregar = ctx.roles.some((r) =>
    ["recepcion", "administrador", "lider_laboratorio"].includes(r),
  );

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Producción
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Entregas</h1>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          RF-071
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Toda entrega registra <b className="font-semibold text-ink">quién la
          recibe, con nombre</b>. Es lo único que sostiene un reclamo de «ese
          trabajo nunca me llegó», que en un laboratorio pasa más de lo que
          parece.
        </p>
      </div>

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Por entregar
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {pendientes.length} {pendientes.length === 1 ? "orden" : "órdenes"}
          </span>
        </div>

        {pendientes.length === 0 ? (
          <p className="p-s6 text-center text-base text-ink-2">
            No queda ninguna orden por entregar.
          </p>
        ) : (
          <ul className="flex flex-col">
            {pendientes.map((o) => {
              const tareas = o.tarea_produccion ?? [];
              const completas = tareas.filter((t) => t.estado === "completa").length;
              const lista = tareas.length > 0 && completas === tareas.length;
              const vence = new Date(`${o.fecha_comprometida}T00:00:00`);
              const atrasada = vence < new Date();

              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0"
                >
                  <div className="flex min-w-[240px] flex-1 flex-col">
                    <span className="font-mono text-sm">{o.codigo}</span>
                    <span className="truncate text-sm text-ink-2">
                      {o.cliente?.razon_social} · {o.doctor?.nombre}
                    </span>
                  </div>

                  <span className="shrink-0 text-sm text-ink-2">
                    <span aria-hidden="true" className="mr-s1 font-mono">
                      {o.estado?.glifo ?? "○"}
                    </span>
                    {o.estado?.nombre}
                  </span>

                  {/* Se dice si el trabajo está terminado, pero NO se impide
                      entregar: hay trabajos que salen a prueba en clínica
                      con etapas todavía abiertas, y bloquearlo obligaría a
                      registrar la entrega fuera del sistema. */}
                  <span
                    className={`shrink-0 font-mono text-xs ${lista ? "text-ok" : "text-warn"}`}
                  >
                    {tareas.length === 0
                      ? "sin etapas"
                      : lista
                        ? "■ producción terminada"
                        : `◑ ${completas}/${tareas.length} etapas`}
                  </span>

                  <span
                    className={`shrink-0 font-mono text-sm tabular-nums ${atrasada ? "text-err" : "text-ink-2"}`}
                  >
                    <span aria-hidden="true">{atrasada ? "▲" : "●"}</span>{" "}
                    {fecha.format(vence)}
                  </span>

                  {puedeEntregar ? (
                    <DialogoEntrega
                      ordenId={o.id}
                      codigo={o.codigo}
                      cliente={o.cliente?.razon_social ?? ""}
                    >
                      <button className="h-[30px] shrink-0 rounded-r1 bg-acc px-s3 text-sm font-semibold text-acc-on">
                        Entregar
                      </button>
                    </DialogoEntrega>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {entregadas.length > 0 ? (
        <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
          <div className="border-b border-line bg-card-2 px-pad-x py-s3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Entregadas
            </h2>
          </div>
          <ul className="flex flex-col">
            {entregadas.map((o) => {
              const e = o.entrega!;
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0"
                >
                  <div className="flex min-w-[240px] flex-1 flex-col">
                    <span className="font-mono text-sm">{o.codigo}</span>
                    <span className="truncate text-sm text-ink-2">
                      {o.cliente?.razon_social}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm text-ink-2">
                    Recibió <b className="font-medium text-ink">{e.receptor}</b>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-3">
                    {ETIQUETA_METODO[e.metodo] ?? e.metodo}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-ok">
                    <span aria-hidden="true">■</span>{" "}
                    {fechaHora.format(new Date(e.entregado_en))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
