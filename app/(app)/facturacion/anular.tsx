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
import { cn } from "@/lib/utils";

import { anularDocumento, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/**
 * Anular una factura borra deuda de la cartera (RN-013), así que se pide
 * el motivo por escrito y se enseña el importe que va a desaparecer.
 *
 * Un documento con pagos aplicados NO se puede anular: quedaría dinero
 * cobrado contra una factura que no existe. La base lo rechaza con un
 * trigger; aquí ni siquiera se ofrece el botón, porque enseñar una acción
 * que se sabe que va a fallar es hacer perder el tiempo.
 */
export function AnularDocumento({
  documentoId,
  numero,
  cliente,
  total,
  cobrado,
}: {
  documentoId: string;
  numero: string;
  cliente: string;
  total: number;
  cobrado: number;
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await anularDocumento(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setMotivo("");
      }
      return r;
    },
    INICIAL,
  );

  // El mismo mínimo que valida la Server Action. Repetirlo aquí no es
  // duplicar la regla: es adelantar el aviso para no ir al servidor a
  // que lo rechace.
  const motivoBastante = motivo.trim().length >= 5;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink transition hover:border-err hover:text-err">
          Anular
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[520px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="documentoId" value={documentoId} />

          <DialogHeader>
            <DialogTitle>Anular {numero}</DialogTitle>
            <DialogDescription>
              La deuda de este documento sale de la cartera y los trabajos
              que factura vuelven a estar pendientes de facturar.
            </DialogDescription>
          </DialogHeader>

          <dl className="flex flex-col gap-s2 rounded-r1 border border-line bg-card-2 p-s3">
            <div className="flex items-baseline justify-between gap-s3">
              <dt className="text-sm text-ink-2">Cliente</dt>
              <dd className="truncate text-sm">{cliente}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-s3">
              <dt className="text-sm text-ink-2">Deja de deber</dt>
              <dd className="font-mono text-base font-semibold tabular-nums">
                {soles.format(total - cobrado)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-s1">
            <label
              htmlFor={`${idForm}-motivo`}
              className="font-mono text-xs uppercase tracking-wide text-ink-2"
            >
              Motivo *
            </label>
            <textarea
              id={`${idForm}-motivo`}
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              name="motivo"
              placeholder="Se emitió a la clínica equivocada"
              className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
            />
            <span className="text-sm text-ink-3">
              Queda en la bitácora. Dentro de seis meses, esto es lo único
              que explicará por qué esta factura no existe.
            </span>
          </div>

          {estado.mensaje && !estado.ok ? (
            <p
              role="status"
              className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
            >
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
              disabled={enviando || !motivoBastante}
              className={cn(
                "h-tap rounded-r1 px-s4 text-sm font-semibold shadow-e1 transition",
                "bg-err text-err-on hover:brightness-110",
                "disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none",
              )}
            >
              {enviando ? "Anulando…" : "Anular documento"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
