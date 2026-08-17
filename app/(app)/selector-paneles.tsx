"use client";

import { useActionState, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PANELES, type Panel } from "@/lib/dominio/panel";
import { cn } from "@/lib/utils";

import { guardarPaneles, restaurarPaneles, type Resultado } from "./acciones-panel";

const INICIAL: Resultado = { ok: false, mensaje: null };

export function SelectorPaneles({
  elegidos,
  personalizado,
}: {
  elegidos: Panel[];
  /** false = todavía está viendo lo que le toca por rol. */
  personalizado: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<Panel[]>(elegidos);
  const [restaurando, setRestaurando] = useState(false);

  const [estado, accion, guardando] = useActionState(
    async (previo: Resultado, formData: FormData) => {
      const r = await guardarPaneles(previo, formData);
      if (r.ok) setAbierto(false);
      return r;
    },
    INICIAL,
  );

  const alternar = (id: Panel) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        // Al reabrir, se parte de lo que hay guardado, no de lo que quedó
        // a medias la última vez que se cerró sin guardar.
        if (v) setSeleccion(elegidos);
      }}
    >
      <DialogTrigger asChild>
        <button className="h-[30px] rounded-r1 border border-line bg-card px-s3 font-mono text-xs text-ink-2 hover:bg-fill">
          Elegir gráficos
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 p-0 sm:max-w-[540px]">
        <DialogHeader className="border-b border-line px-s5 py-s4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Tu dashboard
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2">
            {personalizado
              ? "Estás viendo tu selección."
              : "Estás viendo lo que corresponde a tus roles. En cuanto elijas, manda tu selección."}
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-s3 px-s5 py-s4">
          <ul className="flex flex-col gap-s2">
            {PANELES.map((p) => {
              const activo = seleccion.includes(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-s3 rounded-r1 border p-s3 transition",
                      activo
                        ? "border-acc bg-acc-bg"
                        : "border-line bg-card-2 hover:border-line-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="panel"
                      value={p.id}
                      checked={activo}
                      onChange={() => alternar(p.id)}
                      className="mt-[3px] size-[16px] accent-acc"
                    />
                    <span className="flex flex-col gap-s1">
                      <span className={cn("text-base font-medium", activo && "text-acc")}>
                        {p.nombre}
                      </span>
                      <span className="text-sm leading-relaxed text-ink-2">
                        {p.descripcion}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {seleccion.length === 0 ? (
            <p className="rounded-r1 border border-warn bg-warn-bg px-s3 py-s2 text-sm text-warn">
              Sin ningún gráfico, el dashboard queda vacío. Se respeta: no es
              lo mismo que no haber elegido nunca.
            </p>
          ) : null}

          {estado.mensaje && !estado.ok ? (
            <p role="alert" className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-sm text-err">
              {estado.mensaje}
            </p>
          ) : null}

          <DialogFooter className="flex-wrap gap-s2 border-t border-line pt-s4">
            {personalizado ? (
              <button
                type="button"
                disabled={restaurando}
                onClick={async () => {
                  setRestaurando(true);
                  await restaurarPaneles();
                  setRestaurando(false);
                  setAbierto(false);
                }}
                className="mr-auto h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink-2 hover:bg-fill disabled:opacity-60"
              >
                {restaurando ? "…" : "Volver a lo de mi rol"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-tap rounded-r1 border border-line bg-card px-s4 text-sm text-ink hover:bg-fill"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-fill disabled:text-ink-3"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
