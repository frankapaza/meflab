"use client";

import { piezasDelCuadrante } from "@/lib/validaciones/orden";
import { cn } from "@/lib/utils";

/**
 * M-08: la pieza se ELIGE, no se teclea.
 *
 * Una corona fabricada para el 16 cuando iba al 26 se tira entera, y ese
 * error de transcripción es la causa más común de retrabajo por
 * "información incorrecta" (RF-071). Un odontograma cuesta un clic y
 * elimina la clase de error completa.
 *
 * Se dibuja como se mira una boca: los cuadrantes 1 y 2 arriba, 3 y 4
 * abajo, y el 1 y el 4 a la derecha del que mira.
 */
export function Odontograma({
  seleccionadas,
  onToggle,
  deshabilitado,
}: {
  seleccionadas: readonly string[];
  onToggle: (pieza: string) => void;
  deshabilitado?: boolean;
}) {
  const elegidas = new Set(seleccionadas);

  const fila = (cuadrantes: readonly number[]) => (
    <div className="flex justify-center gap-s4">
      {cuadrantes.map((q) => {
        // El cuadrante del lado derecho del paciente se numera de dentro
        // hacia fuera, así que se dibuja invertido para que el 18 quede
        // en el extremo, como en la boca.
        const piezas = piezasDelCuadrante(q);
        const enOrden = q === 1 || q === 4 ? [...piezas].reverse() : piezas;

        return (
          <div key={q} className="flex gap-[3px]">
            {enOrden.map((pieza) => {
              const activa = elegidas.has(pieza);
              return (
                <button
                  key={pieza}
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => onToggle(pieza)}
                  aria-pressed={activa}
                  aria-label={`Pieza ${pieza}`}
                  className={cn(
                    "grid size-[34px] place-items-center rounded-r1 border font-mono text-xs tabular-nums transition",
                    activa
                      ? "border-acc bg-acc font-semibold text-acc-on"
                      : "border-line bg-card-2 text-ink-2 hover:border-acc hover:text-ink",
                    deshabilitado && "cursor-not-allowed opacity-50",
                  )}
                >
                  {pieza}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-s2 overflow-x-auto rounded-r1 border border-line bg-card p-s3">
      <div className="flex flex-col gap-s1">
        <span className="text-center font-mono text-xs uppercase tracking-wide text-ink-3">
          Superior
        </span>
        {/* Se mira de frente al paciente: su derecha (cuadrantes 1 y 4) cae
            a la izquierda de quien registra, como en la boca. */}
        {fila([1, 2])}
      </div>

      <div className="mx-auto h-px w-[85%] bg-line" />

      <div className="flex flex-col gap-s1">
        {fila([4, 3])}
        <span className="text-center font-mono text-xs uppercase tracking-wide text-ink-3">
          Inferior
        </span>
      </div>
    </div>
  );
}
