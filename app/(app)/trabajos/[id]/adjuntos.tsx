"use client";

import { useActionState, useRef, useState, useTransition } from "react";

import {
  EXTENSIONES,
  GLIFO_ARCHIVO,
  claseDeArchivo,
  pesoLegible,
  validarArchivo,
} from "@/lib/validaciones/archivo";
import { cn } from "@/lib/utils";

import { borrarAdjunto, enlaceFirmado, subirAdjunto, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type Adjunto = {
  id: string;
  nombre: string;
  ruta: string;
  bytes: number | null;
  subidoEn: string;
};

const fechaHora = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

export function Adjuntos({
  ordenId,
  adjuntos,
  puedeSubir,
  puedeBorrar,
}: {
  ordenId: string;
  adjuntos: Adjunto[];
  puedeSubir: boolean;
  puedeBorrar: boolean;
}) {
  const refArchivo = useRef<HTMLInputElement>(null);
  const [elegido, setElegido] = useState<{ nombre: string; bytes: number } | null>(null);
  const [estado, accion, subiendo] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await subirAdjunto(previo, formData);
      if (r.ok) {
        setElegido(null);
        if (refArchivo.current) refArchivo.current.value = "";
      }
      return r;
    },
    INICIAL,
  );

  // Se valida ANTES de subir: avisar tras cargar 80 MB por la conexión de
  // una clínica es hacerle perder el tiempo a quien está en el mostrador.
  const revision = elegido ? validarArchivo(elegido.nombre, elegido.bytes) : null;

  return (
    <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <div className="flex flex-wrap items-baseline justify-between gap-s2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Adjuntos
        </h2>
        <span className="font-mono text-xs text-ink-3">
          {adjuntos.length} {adjuntos.length === 1 ? "archivo" : "archivos"}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink-3">
        Fotos del color, escaneos y la prescripción firmada. Es lo que hace que
        el trabajo se entienda sin llamar al doctor.
      </p>

      {adjuntos.length === 0 ? (
        <p className="rounded-r1 border border-dashed border-line-2 p-s4 text-center text-sm text-ink-3">
          Sin adjuntos todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-s2">
          {adjuntos.map((a) => (
            <Fila
              key={a.id}
              ordenId={ordenId}
              adjunto={a}
              puedeBorrar={puedeBorrar}
            />
          ))}
        </ul>
      )}

      {puedeSubir ? (
        <form action={accion} className="flex flex-col gap-s2 border-t border-line pt-s3">
          <input type="hidden" name="ordenId" value={ordenId} />

          <div className="flex flex-wrap items-center gap-s3">
            <input
              ref={refArchivo}
              type="file"
              name="archivo"
              accept={EXTENSIONES.join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setElegido(f ? { nombre: f.name, bytes: f.size } : null);
              }}
              className="min-w-[240px] flex-1 text-sm text-ink-2 file:mr-s3 file:h-[32px] file:cursor-pointer file:rounded-r1 file:border file:border-line file:bg-card-2 file:px-s3 file:text-sm file:text-ink"
            />

            <button
              type="submit"
              disabled={subiendo || !elegido || !revision?.ok}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {subiendo ? "Subiendo…" : "Adjuntar"}
            </button>
          </div>

          {elegido && revision && !revision.ok ? (
            <p role="alert" className="text-sm text-err">
              {revision.motivo}
            </p>
          ) : elegido ? (
            <p className="font-mono text-xs text-ink-3">
              {elegido.nombre} · {pesoLegible(elegido.bytes)}
            </p>
          ) : (
            <p className="text-sm text-ink-3">
              Hasta 100 MB. Fotos, escaneos (STL, PLY, OBJ, DCM, ZIP) y PDF.
            </p>
          )}

          {estado.mensaje ? (
            <p
              role="status"
              className={cn("text-sm", estado.ok ? "text-ok" : "text-err")}
            >
              {estado.mensaje}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function Fila({
  ordenId,
  adjunto,
  puedeBorrar,
}: {
  ordenId: string;
  adjunto: Adjunto;
  puedeBorrar: boolean;
}) {
  const [abriendo, abrir] = useTransition();
  const [estado, accion, borrando] = useActionState(borrarAdjunto, INICIAL);
  const clase = claseDeArchivo(adjunto.nombre);

  return (
    <li className="flex flex-wrap items-center gap-s3 rounded-r1 border border-line bg-card-2 px-s3 py-s2">
      {/* Glifo por tipo: se distingue una foto de un escaneo sin leer la
          extensión y sin depender del color. */}
      <span aria-hidden="true" className="shrink-0 font-mono text-base text-ink-2">
        {GLIFO_ARCHIVO[clase]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{adjunto.nombre}</span>
        <span className="truncate font-mono text-xs text-ink-3">
          {clase} · {adjunto.bytes ? pesoLegible(adjunto.bytes) : "—"} ·{" "}
          {fechaHora.format(new Date(adjunto.subidoEn))}
        </span>
      </div>

      <button
        type="button"
        disabled={abriendo}
        onClick={() =>
          abrir(async () => {
            const url = await enlaceFirmado(adjunto.ruta);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          })
        }
        className="h-[30px] shrink-0 rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill disabled:opacity-60"
      >
        {abriendo ? "…" : "Abrir"}
      </button>

      {puedeBorrar ? (
        <form action={accion} className="contents">
          <input type="hidden" name="archivoId" value={adjunto.id} />
          <input type="hidden" name="ordenId" value={ordenId} />
          <button
            disabled={borrando}
            title="Borrar este adjunto: se pierde la prueba de lo que pidió el doctor"
            className="h-[30px] shrink-0 rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg disabled:opacity-60"
          >
            {borrando ? "…" : "Borrar"}
          </button>
          {estado.mensaje && !estado.ok ? (
            <span role="alert" className="text-xs text-err">
              {estado.mensaje}
            </span>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}
