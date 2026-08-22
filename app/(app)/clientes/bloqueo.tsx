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

import { alternarBloqueo, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

/**
 * Bloqueo comercial.
 *
 * Bloquear NO desactiva al cliente: sus trabajos en curso siguen, y se le
 * sigue facturando y cobrando lo ya entregado. Lo que se impide es
 * aceptarle trabajo NUEVO. Confundir las dos cosas haría que bloquear a un
 * moroso también impidiera cobrarle, que es justo lo contrario de lo que
 * se busca.
 */
export function AlternarBloqueo({
  clienteId,
  razonSocial,
  bloqueado,
  motivoActual,
}: {
  clienteId: string;
  razonSocial: string;
  bloqueado: boolean;
  motivoActual: string | null;
}) {
  const idForm = useId();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [estado, accion, enviando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await alternarBloqueo(previo, formData);
      if (r.ok) {
        setAbierto(false);
        setMotivo("");
      }
      return r;
    },
    INICIAL,
  );

  const listo = bloqueado || motivo.trim().length >= 5;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button
          className={`h-[30px] rounded-r1 border bg-card px-s3 text-sm transition ${
            bloqueado
              ? "border-line text-ink hover:border-ok hover:text-ok"
              : "border-line text-ink hover:border-warn hover:text-warn"
          }`}
        >
          {bloqueado ? "Desbloquear" : "Bloquear"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[520px]">
        <form action={accion} className="flex flex-col gap-s4">
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="bloquear" value={bloqueado ? "0" : "1"} />

          <DialogHeader>
            <DialogTitle>
              {bloqueado ? "Desbloquear" : "Bloquear"} a {razonSocial}
            </DialogTitle>
            <DialogDescription>
              {bloqueado
                ? "Volverá a poder registrársele trabajo nuevo."
                : "No se le podrá registrar trabajo nuevo. Lo que ya está en producción sigue su curso, y se le sigue pudiendo facturar y cobrar."}
            </DialogDescription>
          </DialogHeader>

          {bloqueado && motivoActual ? (
            <p className="rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-sm leading-relaxed">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
                Se bloqueó por
              </span>{" "}
              {motivoActual}
            </p>
          ) : null}

          {!bloqueado ? (
            <div className="flex flex-col gap-s1">
              <label
                htmlFor={`${idForm}-motivo`}
                className="font-mono text-xs uppercase tracking-wide text-ink-2"
              >
                Motivo *
              </label>
              <textarea
                id={`${idForm}-motivo`}
                name="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Deuda vencida de más de 90 días sin respuesta a tres gestiones"
                className="w-full rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-base leading-relaxed outline-none focus-visible:border-acc"
              />
              <span className="text-sm text-ink-3">
                Lo verá quien intente registrarle un trabajo. «Bloqueado» a
                secas obliga a preguntar por los pasillos.
              </span>
            </div>
          ) : null}

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
              disabled={enviando || !listo}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
            >
              {enviando ? "Guardando…" : bloqueado ? "Desbloquear" : "Bloquear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
