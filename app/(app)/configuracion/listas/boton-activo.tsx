"use client";

import { useActionState } from "react";

import { alternarActivoLista, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function BotonActivoLista({
  listaId,
  activo,
  esDefault,
  nombre,
}: {
  listaId: string;
  activo: boolean;
  esDefault: boolean;
  nombre: string;
}) {
  const [estado, accion, enviando] = useActionState(alternarActivoLista, INICIAL);

  // La base lo impide con un CHECK; aquí se dice por qué, antes de intentarlo.
  if (esDefault) {
    return (
      <button
        disabled
        title="Es la lista por defecto: nombra otra antes de retirar ésta"
        className="h-[30px] cursor-not-allowed rounded-r1 border border-line bg-fill px-s3 text-sm text-ink-3"
      >
        Retirar
      </button>
    );
  }

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="listaId" value={listaId} />
      <input type="hidden" name="activar" value={activo ? "0" : "1"} />
      <button
        disabled={enviando}
        title={
          activo
            ? `Retirar ${nombre}: los clientes que la tengan asignada pasan al precio base`
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
