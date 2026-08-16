"use client";

import { useActionState } from "react";

import { alternarActivo, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function BotonActivo({
  usuarioId,
  activo,
  esYo,
  nombre,
}: {
  usuarioId: string;
  activo: boolean;
  esYo: boolean;
  nombre: string;
}) {
  const [estado, accion, enviando] = useActionState(alternarActivo, INICIAL);

  // Nadie se desactiva a sí mismo. Se deshabilita en la interfaz Y se
  // rechaza en la acción: esto es cortesía, aquello es la barrera.
  if (esYo) {
    return (
      <button
        disabled
        title="No puedes desactivar tu propia cuenta"
        className="h-[30px] cursor-not-allowed rounded-r1 border border-line bg-fill px-s3 text-sm text-ink-3"
      >
        Desactivar
      </button>
    );
  }

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="activar" value={activo ? "0" : "1"} />
      <button
        disabled={enviando}
        title={
          activo
            ? `Desactivar a ${nombre}: su token saldrá sin laboratorio y no verá nada`
            : `Reactivar a ${nombre}`
        }
        className={
          activo
            ? "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-err hover:bg-err-bg disabled:opacity-60"
            : "h-[30px] rounded-r1 border border-line bg-card px-s3 text-sm text-ok hover:bg-ok-bg disabled:opacity-60"
        }
      >
        {enviando ? "…" : activo ? "Desactivar" : "Reactivar"}
      </button>
      {estado.mensaje && !estado.ok ? (
        <span role="alert" className="sr-only">
          {estado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
