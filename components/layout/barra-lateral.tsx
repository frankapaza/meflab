"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { GrupoNav } from "@/lib/auth/navegacion";
import { cn } from "@/lib/utils";

export function BarraLateral({
  nav,
  ambito,
  abierta,
  onCerrar,
}: {
  nav: GrupoNav[];
  ambito: string;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const ruta = usePathname();

  return (
    <>
      {/* Velo sólo en móvil, donde la barra se superpone al contenido. */}
      {abierta ? (
        <button
          aria-label="Cerrar menú"
          onClick={onCerrar}
          className="fixed inset-0 z-20 bg-[var(--scrim)] lg:hidden"
        />
      ) : null}

      <nav
        aria-label="Navegación principal"
        className={cn(
          "flex w-[212px] shrink-0 flex-col gap-s1 overflow-y-auto border-r border-line bg-card p-s2 pt-s3",
          // En móvil se repliega fuera de pantalla y vuelve al abrirse.
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-e3",
          "max-lg:-translate-x-full max-lg:transition-transform",
          abierta && "max-lg:translate-x-0",
        )}
      >
        {nav.map((g) => (
          <div key={g.grupo} className="mb-s3 flex flex-col gap-px">
            <span className="px-s2 pb-s1 pt-s2 font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
              {g.grupo}
            </span>

            {g.items.map((i) => {
              const activo = i.href === "/" ? ruta === "/" : ruta.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={onCerrar}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[32px] items-center gap-s2 rounded-r1 px-s2 text-sm transition",
                    activo
                      ? "bg-acc-bg font-semibold text-acc"
                      : "text-ink-2 hover:bg-fill hover:text-ink",
                  )}
                >
                  {activo ? (
                    <span className="absolute -left-s2 inset-y-[6px] w-[2px] rounded-full bg-acc" />
                  ) : null}
                  <span className="flex-1">{i.etiqueta}</span>

                  {i.aviso ? (
                    <span className="rounded-full bg-err-bg px-s2 py-[2px] font-mono text-[10px] font-semibold text-err">
                      {i.aviso}
                    </span>
                  ) : null}

                  {/* Lo que no es MVP se marca: que nadie lo dé por hecho. */}
                  {i.fase ? (
                    <span
                      title={`Entra en la Fase ${i.fase}`}
                      className="rounded-full bg-fill px-s2 py-[2px] font-mono text-[10px] text-ink-3"
                    >
                      F{i.fase}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-s1 rounded-r2 border border-dashed border-line-2 p-s3">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
            Ámbito activo
          </span>
          <span className="text-sm text-ink-2">{ambito}</span>
        </div>
      </nav>
    </>
  );
}
