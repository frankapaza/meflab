"use client";

import { useActionState, useState } from "react";

import { valorVentaAlmacenado } from "@/lib/validaciones/servicio";
import { variacionSobreBase } from "@/lib/validaciones/lista-precio";
import { cn } from "@/lib/utils";

import { guardarTarifa, type Resultado } from "../acciones";

const INICIAL: Resultado = { ok: false, mensaje: null };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export type FilaTarifa = {
  servicioId: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  /** Valor de venta almacenado del catálogo. */
  precioBase: number;
  /** Valor de venta almacenado en esta lista, o null si no fija precio. */
  precioLista: number | null;
  /** Lo que se tecleó en esta lista, en su modo de captura. */
  precioCapturado: number | null;
};

export function TablaTarifa({
  listaId,
  filas,
  capturaConIgv,
  tasaIgv,
  puedeEditar,
}: {
  listaId: string;
  filas: FilaTarifa[];
  capturaConIgv: boolean;
  tasaIgv: number;
  puedeEditar: boolean;
}) {
  // Los precios se editan en el modo de captura de ESTA lista, y salen tal
  // cual de la base: reconstruirlos multiplicando por el IGV arrastraría un
  // céntimo de deriva en algunos importes.
  const inicial = Object.fromEntries(
    filas.map((f) => [
      f.servicioId,
      f.precioCapturado === null ? "" : String(f.precioCapturado),
    ]),
  );

  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [estado, accion, enviando] = useActionState(guardarTarifa, INICIAL);

  const conPrecio = Object.values(valores).filter((v) => v.trim() !== "").length;

  return (
    <form action={accion} className="flex flex-col gap-s4">
      <input type="hidden" name="listaId" value={listaId} />

      <div className="overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Tarifa
          </h2>
          <span className="font-mono text-xs text-ink-3">
            {conPrecio} de {filas.length} con precio propio
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                <th className="px-pad-x py-s2 font-medium">Servicio</th>
                <th className="px-pad-x py-s2 text-right font-medium">Precio base</th>
                <th className="px-pad-x py-s2 text-right font-medium">
                  En esta lista {capturaConIgv ? "(con IGV)" : "(sin IGV)"}
                </th>
                <th className="px-pad-x py-s2 text-right font-medium">Se guardará</th>
                <th className="px-pad-x py-s2 text-right font-medium">Variación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const crudo = valores[f.servicioId] ?? "";
                const vacio = crudo.trim() === "";
                const numero = Number(crudo);
                const valido = !vacio && Number.isFinite(numero) && numero >= 0;
                const almacenado = valido
                  ? valorVentaAlmacenado(numero, capturaConIgv, tasaIgv)
                  : null;
                const variacion = variacionSobreBase(almacenado, f.precioBase);

                return (
                  <tr key={f.servicioId} className="border-b border-line last:border-0">
                    <td className="px-pad-x py-s2">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-base">{f.nombre}</span>
                        <span className="truncate font-mono text-xs text-ink-3">
                          {f.codigo}
                          {f.categoria ? ` · ${f.categoria}` : ""}
                        </span>
                      </div>
                    </td>

                    <td className="px-pad-x py-s2 text-right font-mono text-sm tabular-nums text-ink-3">
                      {soles.format(f.precioBase)}
                    </td>

                    <td className="px-pad-x py-s2 text-right">
                      <input
                        name={`precio:${f.servicioId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        disabled={!puedeEditar}
                        value={crudo}
                        onChange={(e) =>
                          setValores((p) => ({ ...p, [f.servicioId]: e.target.value }))
                        }
                        placeholder="usa el base"
                        aria-label={`Precio de ${f.nombre} en esta lista`}
                        className={cn(
                          "h-[34px] w-[150px] rounded-r1 border bg-card-2 px-s3 text-right font-mono text-base tabular-nums outline-none placeholder:font-sans placeholder:text-sm placeholder:text-ink-3 focus-visible:border-acc",
                          !vacio && !valido ? "border-err" : "border-line",
                        )}
                      />
                    </td>

                    <td className="px-pad-x py-s2 text-right font-mono text-sm tabular-nums">
                      {almacenado !== null ? (
                        soles.format(almacenado)
                      ) : (
                        <span className="text-ink-3">{soles.format(f.precioBase)}</span>
                      )}
                    </td>

                    {/* La flecha sigue la dirección real del dato; el color
                        dice si eso es bueno. Un precio por encima del
                        tarifario es ▲ y es bueno para el laboratorio. */}
                    <td className="px-pad-x py-s2 text-right font-mono text-sm tabular-nums">
                      {variacion === null || variacion === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        <span className={variacion > 0 ? "text-ok" : "text-warn"}>
                          {variacion > 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)} %
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {estado.mensaje ? (
        <p
          role="status"
          className={cn(
            "rounded-r1 border px-s3 py-s2 text-sm",
            estado.ok ? "border-ok bg-ok-bg text-ok" : "border-err bg-err-bg text-err",
          )}
        >
          {estado.mensaje}
        </p>
      ) : null}

      {puedeEditar ? (
        <div className="flex flex-wrap items-center justify-between gap-s3">
          <p className="max-w-[540px] text-sm leading-relaxed text-ink-3">
            Deja un precio en blanco para que ese servicio use el precio base del
            catálogo. Vacío no es cero: un cero sería regalar el trabajo.
          </p>
          <button
            type="submit"
            disabled={enviando}
            className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3 disabled:shadow-none"
          >
            {enviando ? "Guardando…" : "Guardar tarifa"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
