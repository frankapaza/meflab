"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const fechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Lima",
});

export type Tarjeta = {
  id: string;
  codigo: string;
  prioridad: string;
  fechaComprometida: string;
  estadoId: string;
  cliente: string;
  doctorId: string;
  doctor: string;
  tecnicos: string[];
  etapas: number;
  completas: number;
  importe: number;
  terminada: boolean;
};

export type Columna = { id: string; nombre: string; glifo: string; fase: string };
export type Opcion = { id: string; nombre: string };

/**
 * Semáforo de fechas.
 *
 * El GLIFO sostiene el nivel y el color lo refuerza. El tablero se
 * imprime, se mira en un monitor viejo del taller y lo lee gente con
 * daltonismo: si el nivel viviera sólo en el color, no se leería.
 */
function semaforo(fechaComprometida: string, terminada: boolean) {
  if (terminada) return { glifo: "■", clase: "text-ok", texto: "listo" };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(`${fechaComprometida}T00:00:00`);
  const dias = Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);

  if (dias < 0)
    return { glifo: "▲", clase: "text-err", texto: `${Math.abs(dias)} d de retraso` };
  if (dias === 0) return { glifo: "◆", clase: "text-warn", texto: "vence hoy" };
  if (dias <= 2) return { glifo: "◆", clase: "text-warn", texto: `en ${dias} d` };
  return { glifo: "●", clase: "text-ink-2", texto: `en ${dias} d` };
}

export function Tablero({
  tarjetas,
  columnas,
  doctores,
  tecnicos,
}: {
  tarjetas: Tarjeta[];
  columnas: Columna[];
  doctores: Opcion[];
  tecnicos: Opcion[];
}) {
  const [doctor, setDoctor] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [soloAtrasados, setSoloAtrasados] = useState(false);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const visibles = tarjetas.filter((t) => {
    if (doctor && t.doctorId !== doctor) return false;
    if (tecnico && !t.tecnicos.includes(tecnico)) return false;
    if (soloUrgentes && t.prioridad !== "urgente") return false;
    if (
      soloAtrasados &&
      (t.terminada || new Date(`${t.fechaComprometida}T00:00:00`) >= hoy)
    )
      return false;
    return true;
  });

  const hayFiltro = Boolean(doctor || tecnico || soloUrgentes || soloAtrasados);

  return (
    <div className="flex flex-col gap-s3">
      {/* Los filtros van en UNA fila encima del tablero, no repartidos por
          columnas: el responsable filtra y mira, no busca dónde filtrar. */}
      <div className="flex flex-wrap items-center gap-s2 rounded-r2 border border-line bg-card p-s3">
        <select
          value={doctor}
          onChange={(e) => setDoctor(e.target.value)}
          aria-label="Filtrar por doctor"
          className="h-[32px] min-w-[190px] rounded-r1 border border-line bg-card-2 px-s2 text-sm outline-none focus-visible:border-acc"
        >
          <option value="">Todos los doctores</option>
          {doctores.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>

        <select
          value={tecnico}
          onChange={(e) => setTecnico(e.target.value)}
          aria-label="Filtrar por técnico"
          className="h-[32px] min-w-[190px] rounded-r1 border border-line bg-card-2 px-s2 text-sm outline-none focus-visible:border-acc"
        >
          <option value="">Todos los técnicos</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>

        <Interruptor
          activo={soloUrgentes}
          onClick={() => setSoloUrgentes(!soloUrgentes)}
          glifo="▲"
          etiqueta="Sólo urgentes"
        />
        <Interruptor
          activo={soloAtrasados}
          onClick={() => setSoloAtrasados(!soloAtrasados)}
          glifo="▲"
          etiqueta="Sólo atrasados"
        />

        {hayFiltro ? (
          <button
            type="button"
            onClick={() => {
              setDoctor("");
              setTecnico("");
              setSoloUrgentes(false);
              setSoloAtrasados(false);
            }}
            className="h-[32px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink-2 hover:bg-fill"
          >
            Quitar filtros
          </button>
        ) : null}

        <span className="ml-auto font-mono text-xs text-ink-3">
          {visibles.length} de {tarjetas.length}
        </span>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-r2 border border-line bg-card p-s6 text-center text-base text-ink-2">
          Ninguna orden cumple ese filtro.
        </p>
      ) : (
        <div className="flex gap-s3 overflow-x-auto pb-s2">
          {columnas.map((c) => {
            const suyas = visibles.filter((t) => t.estadoId === c.id);
            const importe = suyas.reduce((s, t) => s + t.importe, 0);

            return (
              <section
                key={c.id}
                className="flex w-[290px] shrink-0 flex-col gap-s2 rounded-r2 border border-line bg-card-2 p-s2"
              >
                <header className="flex items-center justify-between gap-s2 px-s2 pt-s1">
                  <h2 className="truncate text-sm font-semibold text-ink-2">
                    <span aria-hidden="true" className="mr-s1 font-mono">
                      {c.glifo}
                    </span>
                    {c.nombre}
                  </h2>
                  <span className="shrink-0 rounded-r1 bg-fill px-s2 font-mono text-xs tabular-nums text-ink-2">
                    {suyas.length}
                  </span>
                </header>

                {suyas.length === 0 ? (
                  <p className="px-s2 pb-s2 font-mono text-xs text-ink-3">vacía</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-s2">
                      {suyas.map((t) => {
                        const sem = semaforo(t.fechaComprometida, t.terminada);
                        return (
                          <li key={t.id}>
                            <Link
                              href={`/trabajos/${t.id}`}
                              className="flex flex-col gap-s1 rounded-r1 border border-line bg-card p-s3 transition hover:border-acc"
                            >
                              <div className="flex items-center justify-between gap-s2">
                                <span className="font-mono text-sm">{t.codigo}</span>
                                {t.prioridad === "urgente" ? (
                                  <span className="shrink-0 font-mono text-xs font-semibold text-err">
                                    ▲ URG
                                  </span>
                                ) : null}
                              </div>

                              <span className="truncate text-sm text-ink-2">
                                {t.cliente}
                              </span>
                              <span className="truncate font-mono text-xs text-ink-3">
                                {t.doctor}
                              </span>

                              <div className="mt-s1 flex items-center justify-between gap-s2">
                                <span className={cn("font-mono text-xs", sem.clase)}>
                                  <span aria-hidden="true">{sem.glifo}</span>{" "}
                                  {fechaCorta.format(
                                    new Date(`${t.fechaComprometida}T12:00:00`),
                                  )}{" "}
                                  · {sem.texto}
                                </span>
                                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-3">
                                  {t.etapas === 0
                                    ? "sin etapas"
                                    : `${t.completas}/${t.etapas}`}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="px-s2 pb-s1 text-right font-mono text-xs tabular-nums text-ink-3">
                      {soles.format(importe)}
                    </p>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Interruptor({
  activo,
  onClick,
  glifo,
  etiqueta,
}: {
  activo: boolean;
  onClick: () => void;
  glifo: string;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "h-[32px] rounded-r1 border px-s3 text-sm transition",
        activo
          ? "border-acc bg-acc-bg font-semibold text-acc"
          : "border-line bg-card-2 text-ink-2 hover:bg-fill",
      )}
    >
      <span aria-hidden="true" className="mr-s1 font-mono">
        {glifo}
      </span>
      {etiqueta}
    </button>
  );
}
