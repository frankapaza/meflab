"use client";

import { useActionState } from "react";

import { marcarTarea, type Resultado } from "../acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

/**
 * UN toque para empezar, UN toque para terminar.
 *
 * Es el requisito de mayor riesgo del proyecto (CLAUDE.md): si registrar
 * una etapa cuesta más de dos toques, el técnico deja de hacerlo, el
 * módulo de producción se queda vacío y con él la mitad de los
 * indicadores. Nada de diálogos de confirmación ni campos de hora.
 */
export function BotonTarea({
  tareaId,
  estado,
  proceso,
}: {
  tareaId: string;
  estado: string;
  proceso: string;
}) {
  const [resultado, accion, enviando] = useActionState(marcarTarea, INICIAL);

  if (estado === "completa") {
    return (
      <span className="grid h-tap place-items-center rounded-r1 border border-ok bg-ok-bg px-s4 font-mono text-sm font-semibold text-ok">
        ■ Terminada
      </span>
    );
  }

  const iniciando = estado !== "en_curso";

  return (
    <form action={accion} className="contents">
      <input type="hidden" name="tareaId" value={tareaId} />
      <input type="hidden" name="accion" value={iniciando ? "iniciar" : "terminar"} />
      <button
        disabled={enviando}
        aria-label={`${iniciando ? "Empezar" : "Terminar"} ${proceso}`}
        className={
          iniciando
            ? "h-tap min-w-[130px] rounded-r1 bg-acc px-s4 text-base font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:opacity-60"
            : "h-tap min-w-[130px] rounded-r1 bg-ok px-s4 text-base font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:opacity-60"
        }
      >
        {enviando ? "…" : iniciando ? "▶ Empezar" : "■ Terminar"}
      </button>
      {resultado.mensaje && !resultado.ok ? (
        <span role="alert" className="text-sm text-err">
          {resultado.mensaje}
        </span>
      ) : null}
    </form>
  );
}
