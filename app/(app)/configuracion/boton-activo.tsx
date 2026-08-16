"use client";

import { useActionState } from "react";

import { alternarActivoServicio, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function BotonActivoServicio({
  servicioId,
  activo,
  nombre,
}: {
  servicioId: string;
  activo: boolean;
  nombre: string;
}) {
  const [estado, accion, enviando] = useActionState(alternarActivoServicio, INICIAL);

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="activar" value={activo ? "0" : "1"} />
      <button
        disabled={enviando}
        title={
          activo
            ? `Retirar ${nombre} del catálogo: deja de ofrecerse en órdenes nuevas, las anteriores lo conservan`
            : `Volver a ofrecer ${nombre}`
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
