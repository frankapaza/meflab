"use client";

import { useActionState, useState } from "react";

import { horasDelFlujo, horasLegibles } from "@/lib/validaciones/produccion";
import { cn } from "@/lib/utils";

import { guardarEtapas, type Resultado } from "../acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type OpcionProceso = {
  id: string;
  codigo: string;
  nombre: string;
  horasEstimadas: number;
};

export function EditorEtapas({
  flujoId,
  procesos,
  secuenciaInicial,
  puedeEditar,
}: {
  flujoId: string;
  procesos: OpcionProceso[];
  /** IDs de proceso en orden. Un mismo proceso puede repetirse. */
  secuenciaInicial: string[];
  puedeEditar: boolean;
}) {
  const [secuencia, setSecuencia] = useState<string[]>(secuenciaInicial);
  const [aAnadir, setAAnadir] = useState(procesos[0]?.id ?? "");
  const [estado, accion, enviando] = useActionState(guardarEtapas, INICIAL);

  const porId = new Map(procesos.map((p) => [p.id, p]));
  const total = horasDelFlujo(secuencia.map((id) => porId.get(id)?.horasEstimadas ?? 0));

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= secuencia.length) return;
    const copia = [...secuencia];
    const [fila] = copia.splice(desde, 1);
    copia.splice(hacia, 0, fila);
    setSecuencia(copia);
  };

  return (
    <form action={accion} className="flex flex-col gap-s4">
      <input type="hidden" name="flujoId" value={flujoId} />
      {/* La secuencia entera viaja en un campo: la acción la manda a una
          función de la base que borra y reinserta en la misma transacción.
          Fila a fila chocaría con `unique (flujo_id, orden)` al intercambiar
          dos etapas, y a medio camino dejaría el flujo inconsistente. */}
      <input type="hidden" name="secuencia" value={secuencia.join(",")} />

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Secuencia de etapas
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {secuencia.length} {secuencia.length === 1 ? "etapa" : "etapas"} ·{" "}
            {horasLegibles(total)} por pieza
          </span>
        </div>

        {secuencia.length === 0 ? (
          <div className="flex flex-col items-center gap-s2 p-s6 text-center">
            <p className="text-base font-medium text-warn">Este flujo no tiene etapas</p>
            <p className="max-w-[420px] text-sm leading-relaxed text-ink-2">
              Una orden que lo use entrará en producción sin ninguna tarea: no
              aparecerá en el tablero de nadie y nadie sabrá que hay que
              fabricarla.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {secuencia.map((procesoId, i) => {
              const p = porId.get(procesoId);
              return (
                <li
                  key={`${procesoId}-${i}`}
                  className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0"
                >
                  <span className="grid size-[28px] shrink-0 place-items-center rounded-r1 bg-fill font-mono text-sm tabular-nums text-ink-2">
                    {i + 1}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-medium">
                      {p?.nombre ?? "Proceso retirado"}
                    </span>
                    <span className="truncate font-mono text-xs text-ink-3">
                      {p?.codigo ?? "—"} · {horasLegibles(p?.horasEstimadas ?? 0)}
                    </span>
                  </div>

                  {puedeEditar ? (
                    <div className="flex shrink-0 gap-s1">
                      <BotonOrden
                        etiqueta="Subir"
                        glifo="▲"
                        onClick={() => mover(i, i - 1)}
                        deshabilitado={i === 0}
                      />
                      <BotonOrden
                        etiqueta="Bajar"
                        glifo="▼"
                        onClick={() => mover(i, i + 1)}
                        deshabilitado={i === secuencia.length - 1}
                      />
                      <button
                        type="button"
                        onClick={() => setSecuencia(secuencia.filter((_, j) => j !== i))}
                        title={`Quitar ${p?.nombre ?? "esta etapa"} del flujo`}
                        className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {puedeEditar ? (
        <div className="flex flex-wrap items-end gap-s3 rounded-r2 border border-line bg-card p-s4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-s1">
            <label
              htmlFor="anadir-proceso"
              className="font-mono text-xs uppercase tracking-wide text-ink-2"
            >
              Añadir etapa al final
            </label>
            <select
              id="anadir-proceso"
              value={aAnadir}
              onChange={(e) => setAAnadir(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              {procesos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre} ({horasLegibles(p.horasEstimadas)})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!aAnadir}
            onClick={() => setSecuencia([...secuencia, aAnadir])}
            className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill disabled:cursor-not-allowed disabled:text-ink-3"
          >
            Añadir
          </button>

          <span className="basis-full text-sm leading-relaxed text-ink-3">
            Un proceso puede repetirse: hay trabajos con dos pruebas en
            clínica, y cada una es una etapa distinta que se registra aparte.
          </span>
        </div>
      ) : null}

      {estado.mensaje ? (
        <p
          role="status"
          className={cn(
            "rounded-r1 border px-s3 py-s2 text-sm",
            estado.ok ? "border-ok bg-ok-bg text-ok" : "border-err bg-err-bg text-err",
          )}
        >
          {estado.mensaje}
        </p>
      ) : null}

      {puedeEditar ? (
        <div className="flex flex-wrap items-center justify-between gap-s3">
          <p className="max-w-[560px] text-sm leading-relaxed text-ink-3">
            Cambiar la secuencia no toca las órdenes que ya están en marcha:
            las etapas se copian al registrar la orden, no se leen del flujo.
          </p>
          <button
            type="submit"
            disabled={enviando}
            className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
          >
            {enviando ? "Guardando…" : "Guardar secuencia"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function BotonOrden({
  etiqueta,
  glifo,
  onClick,
  deshabilitado,
}: {
  etiqueta: string;
  glifo: string;
  onClick: () => void;
  deshabilitado: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      className="grid size-[30px] place-items-center rounded-r1 border border-line bg-card text-sm text-ink hover:bg-fill disabled:cursor-not-allowed disabled:text-ink-3"
    >
      {glifo}
    </button>
  );
}
