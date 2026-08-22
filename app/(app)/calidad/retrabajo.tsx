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
import { CAUSAS, POLITICAS, politicaSugerida } from "@/lib/dominio/calidad";
import { cn } from "@/lib/utils";

import { abrirRetrabajo, cerrarRetrabajo, type Resultado } from "./acciones";
import type { OrdenInspeccionable } from "./inspeccionar";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function NuevoRetrabajo({ ordenes }: { ordenes: OrdenInspeccionable[] }) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [causa, setCausa] = useState("error_laboratorio");
  const [politica, setPolitica] = useState("cubierto");
  const [importe, setImporte] = useState("0");
  const [descripcion, setDescripcion] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await abrirRetrabajo(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setDescripcion("");
        setImporte("0");
      }
      return r;
    },
    INICIAL,
  );

  // Cambiar la causa sugiere una política, pero no la impone: quien la
  // cambie está tomando una decisión comercial y debe poder hacerlo.
  function elegirCausa(valor: string) {
    setCausa(valor);
    const sugerida = politicaSugerida(valor);
    setPolitica(sugerida);
    if (sugerida === "cubierto") setImporte("0");
  }

  const cubierto = politica === "cubierto";
  const valor = Number(importe) || 0;
  const listo =
    descripcion.trim().length >= 5 && (cubierto ? valor === 0 : valor > 0);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill">
          Abrir retrabajo
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] max-w-[600px] overflow-y-auto">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="causa" value={causa} />
          <input type="hidden" name="politica" value={politica} />
          <input type="hidden" name="importeFacturable" value={cubierto ? "0" : importe} />

          <DialogHeader>
            <DialogTitle>Abrir retrabajo</DialogTitle>
            <DialogDescription>
              Cuelga de la orden original. Sin ese enlace, la tasa de
              retrabajo daría siempre cero y el costo de la mala calidad
              sería invisible.
            </DialogDescription>
          </DialogHeader>

          <Campo etiqueta="Trabajo *" id={`${idForm}-ot`}>
            <select
              id={`${idForm}-ot`}
              name="ordenId"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              <option value="">Elige el trabajo…</option>
              {ordenes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo} · {o.trabajo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Qué hay que rehacer *"
            id={`${idForm}-desc`}
            ayuda="Lo leerá quien lo rehaga."
          >
            <textarea
              id={`${idForm}-desc`}
              name="descripcion"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Rehacer la corona: el ajuste marginal quedó alto"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
          </Campo>

          {/* La causa dice de quién fue; la política, quién paga. Son
              cosas distintas y se eligen por separado a propósito. */}
          <fieldset className="flex flex-col gap-s2">
            <legend className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Por qué pasó
            </legend>
            <div className="grid gap-s2 sm:grid-cols-2">
              {CAUSAS.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() => elegirCausa(c.valor)}
                  className={cn(
                    "flex flex-col gap-[2px] rounded-r1 border p-s2 text-left transition",
                    causa === c.valor
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="text-sm font-medium">{c.etiqueta}</span>
                  <span className="text-xs leading-relaxed text-ink-3">{c.ayuda}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-s2">
            <legend className="font-mono text-xs uppercase tracking-wide text-ink-2">
              Quién lo paga
            </legend>
            <div className="grid gap-s2 sm:grid-cols-3">
              {POLITICAS.map((p) => (
                <button
                  key={p.valor}
                  type="button"
                  onClick={() => {
                    setPolitica(p.valor);
                    if (p.valor === "cubierto") setImporte("0");
                  }}
                  className={cn(
                    "flex flex-col gap-[2px] rounded-r1 border p-s2 text-left transition",
                    politica === p.valor
                      ? "border-acc bg-acc-bg"
                      : "border-line bg-card-2 hover:border-line-2",
                  )}
                >
                  <span className="text-sm font-medium">{p.etiqueta}</span>
                  <span className="text-xs leading-relaxed text-ink-3">{p.ayuda}</span>
                </button>
              ))}
            </div>
            <span className="text-sm leading-relaxed text-ink-3">
              Se sugiere según la causa, pero mandas tú: cubrir por cortesía
              algo que no nos toca es una decisión comercial legítima, y
              conviene que quede escrita como tal.
            </span>
          </fieldset>

          {!cubierto ? (
            <Campo
              etiqueta="Cuánto se le cobra *"
              id={`${idForm}-imp`}
              ayuda="Se factura aparte; este importe no crea deuda por sí solo."
            >
              <input
                id={`${idForm}-imp`}
                type="number"
                step="0.01"
                min="0.01"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc"
              />
            </Campo>
          ) : null}

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
              {enviando ? "Abriendo…" : "Abrir retrabajo"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cerrar un retrabajo.
 *
 * El costo no se teclea: se suma del material que se consumió contra él.
 * Tecleado sería una estimación, y con estimaciones el costo de la mala
 * calidad siempre sale bajo.
 */
export function CerrarRetrabajo({
  retrabajoId,
  codigo,
}: {
  retrabajoId: string;
  codigo: string;
}) {
  const [, accion, enviando] = useActionState(cerrarRetrabajo, INICIAL);

  return (
    <form action={accion}>
      <input type="hidden" name="retrabajoId" value={retrabajoId} />
      <button
        disabled={enviando}
        title={`Cerrar el retrabajo de ${codigo} y calcular su costo`}
        className="h-[28px] rounded-r1 border border-line bg-card px-s2 text-sm text-ink transition hover:border-ok hover:text-ok disabled:opacity-50"
      >
        {enviando ? "Cerrando…" : "Cerrar"}
      </button>
    </form>
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
