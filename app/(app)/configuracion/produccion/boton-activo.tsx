"use client";

import { useActionState } from "react";

import { alternarActivoProceso, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function BotonActivoProceso({
  procesoId,
  activo,
  nombre,
  enFlujos,
}: {
  procesoId: string;
  activo: boolean;
  nombre: string;
  enFlujos: number;
}) {
  const [estado, accion, enviando] = useActionState(alternarActivoProceso, INICIAL);

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="procesoId" value={procesoId} />
      <input type="hidden" name="activar" value={activo ? "0" : "1"} />
      <button
        disabled={enviando}
        title={
          activo
            ? enFlujos > 0
              ? `Retirar ${nombre}: seguirá en los ${enFlujos} flujos que ya lo usan, pero no podrá añadirse a más`
              : `Retirar ${nombre} del catálogo de procesos`
            : `Volver a usar ${nombre}`
        }
        className={
          activo
            ? "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg disabled:opacity-60"
            : "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ok hover:bg-ok-bg disabled:opacity-60"
        }
      >
        {enviando ? "…" : activo ? "Retirar" : "Reactivar"}
      </button>
      {estado.mensaje && !estado.ok ? (
        <span role="alert" className="sr-only">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
