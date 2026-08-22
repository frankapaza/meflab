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
import { ESTADOS_CPE } from "@/lib/validaciones/facturacion";
import { cn } from "@/lib/utils";

import { registrarCpe, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

/**
 * Anotar a mano el resultado de la declaración electrónica.
 *
 * El laboratorio todavía no está integrado con ningún PSE: emite por
 * fuera y anota aquí lo que le devuelven. Estos son los MISMOS campos que
 * rellenará la integración cuando llegue, así que lo tecleado hoy no se
 * pierde ni hay que migrarlo.
 */
export function RegistrarCpe({
  documentoId,
  numero,
  estadoActual,
  hashActual,
  ticketActual,
  respuestaActual,
}: {
  documentoId: string;
  numero: string;
  estadoActual: string;
  hashActual: string | null;
  ticketActual: string | null;
  respuestaActual: string | null;
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [estadoCpe, setEstadoCpe] = useState(estadoActual);
  const [respuesta, setRespuesta] = useState(respuestaActual ?? "");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarCpe(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const actual = ESTADOS_CPE.find((e) => e.valor === estadoActual) ?? ESTADOS_CPE[0];
  const esRechazo = estadoCpe === "rechazado";
  const listo = !esRechazo || respuesta.trim().length >= 5;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button
          title="Anotar el resultado de la declaración ante SUNAT"
          className={cn(
            "h-[26px] rounded-r1 border px-s2 font-mono text-xs uppercase transition",
            actual.clase,
          )}
        >
          <span aria-hidden="true">{actual.glifo}</span> {actual.corto}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[560px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="documentoId" value={documentoId} />
          <input type="hidden" name="estadoCpe" value={estadoCpe} />

          <DialogHeader>
            <DialogTitle>Declaración electrónica de {numero}</DialogTitle>
            <DialogDescription>
              Todavía no hay integración con un proveedor electrónico. Anota
              aquí lo que te devuelve el sistema por el que emites.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card-2 p-s3">
            <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
              Provisional
            </span>
            <p className="text-sm leading-relaxed text-ink-2">
              Estos son los mismos campos que rellenará la integración
              cuando se contrate el PSE. Lo que teclees ahora{" "}
              <b className="font-semibold text-ink">no habrá que migrarlo</b>.
            </p>
          </div>

          <fieldset className="flex flex-col gap-s2">
            <legend className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Cómo está ante SUNAT
            </legend>
            <div className="grid gap-s2 sm:grid-cols-2">
              {ESTADOS_CPE.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  onClick={() => setEstadoCpe(e.valor)}
                  className={cn(
                    "flex flex-col gap-[2px] rounded-r1 border p-s2 text-left transition",
                    estadoCpe === e.valor
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="text-sm font-medium">
                    <span aria-hidden="true">{e.glifo}</span> {e.etiqueta}
                  </span>
                  <span className="text-xs leading-relaxed text-ink-3">{e.ayuda}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-s3 sm:grid-cols-2">
            <Campo
              etiqueta="Hash / código"
              id={`${idForm}-hash`}
              ayuda="Lo que se dicta cuando el contador pregunta."
            >
              <input
                id={`${idForm}-hash`}
                name="hash"
                defaultValue={hashActual ?? ""}
                placeholder="qX8f2b1c…"
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none focus-visible:border-acc"
              />
            </Campo>
            <Campo etiqueta="Ticket" id={`${idForm}-tk`} ayuda="Si el emisor te dio uno.">
              <input
                id={`${idForm}-tk`}
                name="ticket"
                defaultValue={ticketActual ?? ""}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base outline-none focus-visible:border-acc"
              />
            </Campo>
          </div>

          <Campo
            etiqueta={esRechazo ? "Motivo del rechazo *" : "Respuesta de SUNAT"}
            id={`${idForm}-resp`}
            ayuda={
              esRechazo
                ? "Sin el motivo no se puede corregir y reenviar."
                : "Literal, tal como llegó."
            }
          >
            <textarea
              id={`${idForm}-resp`}
              name="respuesta"
              rows={2}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="2335 - El dato ingresado en el tipo de documento del receptor no es válido"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
          </Campo>

          {estado.mensaje && !estado.ok ? (
            <p role="status" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !listo}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : "Guardar"}
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
    <div className="flex min-w-0 flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
      {ayuda ? <span className="text-sm text-ink-3">{ayuda}</span> : null}
    </div>
  );
}
