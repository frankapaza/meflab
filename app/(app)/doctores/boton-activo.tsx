"use client";

import { useActionState } from "react";

import { alternarActivoDoctor, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function BotonActivoDoctor({
  doctorId,
  activo,
  nombre,
}: {
  doctorId: string;
  activo: boolean;
  nombre: string;
}) {
  const [estado, accion, enviando] = useActionState(alternarActivoDoctor, INICIAL);

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="activar" value={activo ? "0" : "1"} />
      <button
        disabled={enviando}
        title={
          activo
            ? `Dar de baja a ${nombre}: deja de aparecer al registrar órdenes, pero su historial se conserva`
            : `Reactivar a ${nombre}`
        }
        className={
          activo
            ? "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg disabled:opacity-60"
            : "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ok hover:bg-ok-bg disabled:opacity-60"
        }
      >
        {enviando ? "…" : activo ? "Dar de baja" : "Reactivar"}
      </button>
      {estado.mensaje && !estado.ok ? (
        <span role="alert" className="sr-only">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
