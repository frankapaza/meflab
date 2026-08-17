"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { METODOS } from "@/lib/validaciones/entrega";

import { registrarEntrega, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export type OpcionEvidencia = { id: string; nombre: string };

export function DialogoEntrega({
  ordenId,
  codigo,
  cliente,
  evidencias,
  children,
}: {
  ordenId: string;
  codigo: string;
  cliente: string;
  /** Adjuntos de ESTA orden que pueden servir de prueba de entrega. */
  evidencias: OpcionEvidencia[];
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const idForm = useId();
  const refReceptor = useRef<HTMLInputElement>(null);

  const [receptor, setReceptor] = useState("");
  const [metodo, setMetodo] = useState("mostrador");
  const [observaciones, setObservaciones] = useState("");
  const [evidenciaId, setEvidenciaId] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await registrarEntrega(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          refReceptor.current?.focus();
        }}
        className="gap-0 p-0 sm:max-w-[520px]"
      >
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Entregar {codigo}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            {cliente}. Quién recibe queda registrado con nombre: es lo único
            que sostiene un reclamo de «nunca me llegó».
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s4 px-s5 py-s4">
          <input type="hidden" name="ordenId" value={ordenId} />

          <Campo etiqueta="Quién lo recibe *" id={`${idForm}-r`}>
            <input
              ref={refReceptor}
              id={`${idForm}-r`}
              name="receptor"
              required
              minLength={3}
              value={receptor}
              onChange={(e) => setReceptor(e.target.value)}
              placeholder="Srta. Paola Requena, recepción de la clínica"
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          <Campo etiqueta="Cómo se entregó *" id={`${idForm}-m`}>
            <select
              id={`${idForm}-m`}
              name="metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          {/* La evidencia sale de los adjuntos de ESTA orden, no de un
              subidor aparte: así no se puede adjuntar por error la foto de
              otro trabajo, y la base lo comprueba además con un trigger. */}
          <Campo etiqueta="Evidencia" id={`${idForm}-e`}>
            {evidencias.length === 0 ? (
              <p className="rounded-r1 border border-dashed border-line-2 px-s3 py-s2 text-sm text-ink-3">
                Esta orden no tiene adjuntos. Súbelos desde{" "}
                <Link href={`/trabajos/${ordenId}`} className="text-acc hover:underline">
                  su ficha
                </Link>{" "}
                si quieres dejar una foto como prueba.
              </p>
            ) : (
              <select
                id={`${idForm}-e`}
                name="evidenciaId"
                value={evidenciaId}
                onChange={(e) => setEvidenciaId(e.target.value)}
                className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
              >
                <option value="">Sin evidencia adjunta</option>
                {evidencias.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo etiqueta="Observaciones" id={`${idForm}-o`}>
            <textarea
              id={`${idForm}-o`}
              name="observaciones"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Se entregó con el modelo de trabajo…"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none placeholder:text-ink-3 focus-visible:border-acc"
            />
          </Campo>

          <p className="rounded-r1 border border-line border-l-2 border-l-acc bg-card-2 px-s3 py-s2 text-sm leading-relaxed text-ink-2">
            Al registrar la entrega, la orden pasa al estado final del ciclo y
            queda su rastro en el historial.
          </p>

          {estado.mensaje && !estado.ok ? (
            <p role="alert" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter className="gap-s2 border-t border-line pt-s4">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || receptor.trim().length < 3}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Registrando…" : "Registrar entrega"}
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
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
