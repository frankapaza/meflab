import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { horasLegibles } from "@/lib/validaciones/produccion";

import { BotonTarea } from "./boton-tarea";

export const metadata = { title: "Mis tareas · MEFLAB" };

const fechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Lima",
});

type Tarea = {
  id: string;
  estado: string;
  orden_etapa: number;
  horas_estimadas: number;
  iniciada_en: string | null;
  proceso: { codigo: string; nombre: string } | null;
  orden: {
    codigo: string;
    prioridad: string;
    fecha_comprometida: string;
    doctor: { nombre: string } | null;
    // El paciente NO se lee de la tabla: el técnico ve el nombre y nada
    // más, y eso lo garantiza la vista (RNF-006).
    paciente_id: string;
  } | null;
};

export default async function MisTareasPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("tarea_produccion")
    .select(
      "id, estado, orden_etapa, horas_estimadas, iniciada_en, proceso:proceso_id(codigo, nombre), orden:orden_id(codigo, prioridad, fecha_comprometida, paciente_id, doctor:doctor_id(nombre))",
    )
    .eq("tecnico_id", ctx.usuarioId)
    .in("estado", ["asignada", "en_curso", "completa"])
    .order("orden_etapa");

  // Lo que está en curso va primero: es la pieza que el técnico tiene en la
  // mano. Ordenar por el nombre del estado lo mandaría al final, porque
  // "en_curso" va después de "asignada" en el alfabeto.
  const PESO: Record<string, number> = { en_curso: 0, asignada: 1, completa: 2 };
  const tareas = ((data ?? []) as unknown as Tarea[]).sort(
    (a, b) => (PESO[a.estado] ?? 9) - (PESO[b.estado] ?? 9),
  );

  const { data: pacientes } = await supabase.from("v_paciente").select("id, nombre");
  const nombrePaciente = new Map(
    (pacientes ?? []).map((p) => [p.id as string, p.nombre as string]),
  );

  const pendientes = tareas.filter((t) => t.estado !== "completa");
  const hechas = tareas.filter((t) => t.estado === "completa");
  const horasPendientes = pendientes.reduce((s, t) => s + Number(t.horas_estimadas), 0);

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            Producción
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Mis tareas</h1>
        </div>
        <span className="font-mono text-sm text-ink-2">
          {pendientes.length} {pendientes.length === 1 ? "pendiente" : "pendientes"} ·{" "}
          {horasLegibles(horasPendientes)}
        </span>
      </header>

      {pendientes.length === 0 ? (
        <div className="grid min-h-[240px] place-items-center rounded-r2 border border-line bg-card p-s6">
          <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
            <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
              ○
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              No tienes tareas pendientes
            </h2>
            <p className="text-base leading-relaxed text-ink-2">
              Cuando el responsable de producción te asigne una etapa,
              aparecerá aquí.
            </p>
          </div>
        </div>
      ) : (
        /* Una tarjeta por tarea, con el botón grande a la derecha: es la
           pantalla que se usa de pie y con guantes. */
        <ul className="flex flex-col gap-s3">
          {pendientes.map((t) => {
            const urgente = t.orden?.prioridad === "urgente";
            const vence = t.orden
              ? new Date(`${t.orden.fecha_comprometida}T00:00:00`)
              : null;
            const atrasada = vence ? vence < new Date() : false;

            return (
              <li
                key={t.id}
                className={`flex flex-wrap items-center gap-s4 rounded-r2 border bg-card p-s4 shadow-e1 ${
                  t.estado === "en_curso" ? "border-acc" : "border-line"
                }`}
              >
                <div className="flex min-w-[260px] flex-1 flex-col gap-s1">
                  <div className="flex flex-wrap items-center gap-s2">
                    <span className="text-xl font-semibold tracking-tight">
                      {t.proceso?.nombre ?? "Etapa"}
                    </span>
                    {urgente ? (
                      <span className="rounded-r1 bg-err-bg px-s2 py-[2px] font-mono text-xs font-semibold text-err">
                        ▲ URGENTE
                      </span>
                    ) : null}
                    {t.estado === "en_curso" ? (
                      <span className="rounded-r1 bg-acc-bg px-s2 py-[2px] font-mono text-xs font-semibold text-acc">
                        ◑ EN CURSO
                      </span>
                    ) : null}
                  </div>

                  <span className="font-mono text-sm text-ink-2">
                    {t.orden?.codigo} · etapa {t.orden_etapa} ·{" "}
                    {horasLegibles(Number(t.horas_estimadas))}
                  </span>

                  <span className="text-sm text-ink-3">
                    {t.orden ? nombrePaciente.get(t.orden.paciente_id) ?? "Paciente" : ""}
                    {t.orden?.doctor ? ` · ${t.orden.doctor.nombre}` : ""}
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-s1">
                  <span
                    className={`font-mono text-sm tabular-nums ${atrasada ? "text-err" : "text-ink-2"}`}
                  >
                    <span aria-hidden="true">{atrasada ? "▲" : "●"}</span>{" "}
                    {vence ? fechaCorta.format(vence) : "—"}
                  </span>
                  <BotonTarea
                    tareaId={t.id}
                    estado={t.estado}
                    proceso={t.proceso?.nombre ?? "la etapa"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hechas.length > 0 ? (
        <details className="rounded-r2 border border-line bg-card p-s4">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-ink-2">
            {hechas.length} {hechas.length === 1 ? "terminada" : "terminadas"}
          </summary>
          <ul className="mt-s3 flex flex-col gap-s2">
            {hechas.map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-s2 text-sm">
                <span className="text-ink-2">
                  <span aria-hidden="true" className="text-ok">
                    ■
                  </span>{" "}
                  {t.proceso?.nombre} · {t.orden?.codigo}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  estimado {horasLegibles(Number(t.horas_estimadas))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
