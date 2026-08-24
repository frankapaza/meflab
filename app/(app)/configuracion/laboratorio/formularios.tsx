"use client";

import { useActionState, useId } from "react";

import { guardarIdentidad, guardarParametro, type Resultado } from "./acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

/**
 * Identidad del laboratorio.
 *
 * No es cosmética: el nombre, el RUC y la dirección van impresos en cada
 * comprobante y en cada estado de cuenta. Hasta ahora sólo se podían
 * cambiar por SQL.
 */
export function Identidad({
  nombre,
  ruc,
  direccion,
  sedeId,
  puedeEditar,
}: {
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  sedeId: string;
  puedeEditar: boolean;
}) {
  const idForm = useId();
  const [estado, accion, enviando] = useActionState(guardarIdentidad, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-s3">
      <input type="hidden" name="sedeId" value={sedeId} />

      <div className="grid gap-s3 lg:grid-cols-2">
        <Campo etiqueta="Nombre del laboratorio *" id={`${idForm}-nom`}>
          <input
            id={`${idForm}-nom`}
            name="nombre"
            defaultValue={nombre}
            disabled={!puedeEditar}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc disabled:opacity-60"
          />
        </Campo>

        <Campo
          etiqueta="RUC"
          id={`${idForm}-ruc`}
          ayuda="Once dígitos. Va impreso en cada comprobante."
        >
          <input
            id={`${idForm}-ruc`}
            name="ruc"
            defaultValue={ruc ?? ""}
            inputMode="numeric"
            disabled={!puedeEditar}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 font-mono text-base tabular-nums outline-none focus-visible:border-acc disabled:opacity-60"
          />
        </Campo>
      </div>

      <Campo
        etiqueta="Dirección de la sede"
        id={`${idForm}-dir`}
        ayuda="La que aparece en el comprobante y en el estado de cuenta."
      >
        <input
          id={`${idForm}-dir`}
          name="direccion"
          defaultValue={direccion ?? ""}
          disabled={!puedeEditar}
          className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s3 text-base outline-none focus-visible:border-acc disabled:opacity-60"
        />
      </Campo>

      {estado.mensaje ? (
        <p
          role="status"
          className={
            estado.ok
              ? "rounded-r1 border border-ok bg-ok-bg px-s3 py-s2 text-sm text-ok"
              : "rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err"
          }
        >
          {estado.mensaje}
        </p>
      ) : null}

      {puedeEditar ? (
        <button
          type="submit"
          disabled={enviando}
          className="h-tap self-start rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3"
        >
          {enviando ? "Guardando…" : "Guardar datos"}
        </button>
      ) : null}
    </form>
  );
}

/**
 * Un parámetro numérico del laboratorio.
 *
 * Cada uno en su propio formulario: guardar todos juntos obligaría a
 * revisar los tres cada vez que se cambia uno, y un error en el IGV es
 * más caro que un clic de más.
 */
export function Parametro({
  clave,
  etiqueta,
  valor,
  ayuda,
  sufijo,
  paso,
  puedeEditar,
  alerta,
}: {
  clave: string;
  etiqueta: string;
  valor: number;
  ayuda: string;
  sufijo?: string;
  paso: string;
  puedeEditar: boolean;
  alerta?: string;
}) {
  const idForm = useId();
  const [estado, accion, enviando] = useActionState(guardarParametro, INICIAL);

  return (
    <form
      action={accion}
      className={
        alerta
          ? "flex flex-col gap-s2 rounded-r1 border border-warn bg-warn-bg p-s3"
          : "flex flex-col gap-s2 rounded-r1 border border-line bg-card-2 p-s3"
      }
    >
      <input type="hidden" name="clave" value={clave} />

      <label
        htmlFor={`${idForm}-v`}
        className="font-mono text-xs uppercase tracking-wide text-ink-2"
      >
        {etiqueta}
      </label>

      <div className="flex items-center gap-s2">
        <input
          id={`${idForm}-v`}
          name="valor"
          type="number"
          step={paso}
          min="0"
          defaultValue={String(valor)}
          disabled={!puedeEditar}
          className="h-[38px] w-[140px] rounded-r1 border border-line bg-card px-s3 text-right font-mono text-base tabular-nums outline-none focus-visible:border-acc disabled:opacity-60"
        />
        {sufijo ? (
          <span className="font-mono text-sm text-ink-3">{sufijo}</span>
        ) : null}
        {puedeEditar ? (
          <button
            type="submit"
            disabled={enviando}
            className="h-[38px] rounded-r1 border border-line bg-card px-s3 text-sm text-ink hover:bg-fill disabled:opacity-50"
          >
            {enviando ? "…" : "Guardar"}
          </button>
        ) : null}
      </div>

      <span className="text-sm leading-relaxed text-ink-3">{ayuda}</span>

      {/* El aviso de un parámetro sin configurar importa más que el
          parámetro: un costo de hora en cero no da error, da márgenes
          falsos que nadie cuestiona. */}
      {alerta ? (
        <p className="text-sm leading-relaxed text-warn">
          <span aria-hidden="true">▲</span> {alerta}
        </p>
      ) : null}

      {estado.mensaje ? (
        <p
          role="status"
          className={estado.ok ? "text-sm text-ok" : "text-sm text-err"}
        >
          {estado.mensaje}
        </p>
      ) : null}
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
