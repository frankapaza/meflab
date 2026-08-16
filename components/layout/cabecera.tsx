"use client";

import { useTema, type Densidad } from "@/components/tema";
import { salir } from "@/app/(auth)/login/acciones";
import { cn } from "@/lib/utils";

const DENSIDADES: Densidad[] = ["compacto", "normal", "amplio"];

export function Cabecera({
  laboratorio,
  usuario,
  roles,
  iniciales,
  onAbrirMenu,
}: {
  laboratorio: string;
  usuario: string;
  roles: string;
  iniciales: string;
  onAbrirMenu: () => void;
}) {
  const { tema, densidad, alternarTema, cambiarDensidad } = useTema();

  return (
    <header className="z-10 flex shrink-0 flex-wrap items-center gap-s3 border-b border-line bg-card px-s4 py-s2">
      <button
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
        className="grid size-[34px] shrink-0 place-items-center rounded-r1 border border-line text-xl text-ink-2 hover:bg-fill lg:hidden"
      >
        ☰
      </button>

      <div className="flex shrink-0 items-center gap-s2">
        <div className="grid size-[26px] place-items-center rounded-r1 bg-acc text-sm font-bold text-acc-on">
          M
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">MEFLAB</span>
          <span className="font-mono text-[10px] tracking-[0.1em] text-ink-3">
            {laboratorio.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Buscador global: el requisito de Recepción es responder "¿cómo va
          mi trabajo?" en menos de 10 segundos, desde cualquier pantalla. */}
      <button
        className="flex h-[34px] min-w-[180px] max-w-[440px] flex-1 items-center gap-s2 rounded-r2 border border-line bg-card-2 px-s3 text-sm text-ink-3 transition hover:border-line-2 hover:bg-card"
        aria-label="Buscar orden, doctor o paciente"
      >
        <span className="size-[13px] shrink-0 rounded-full border-[1.5px] border-current opacity-80" />
        <span className="flex-1 truncate text-left">
          Buscar orden, doctor o paciente…
        </span>
        <kbd className="shrink-0 rounded-r1 border border-line bg-card px-s2 py-[2px] font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-s2">
        <button
          onClick={alternarTema}
          className="h-[30px] rounded-r1 border border-line bg-card-2 px-s3 font-mono text-xs text-ink-2 hover:bg-fill"
          aria-label={`Cambiar a tema ${tema === "claro" ? "oscuro" : "claro"}`}
        >
          {tema === "claro" ? "OSCURO" : "CLARO"}
        </button>

        <div
          className="flex overflow-hidden rounded-r1 border border-line"
          role="group"
          aria-label="Densidad"
        >
          {DENSIDADES.map((d) => (
            <button
              key={d}
              onClick={() => cambiarDensidad(d)}
              aria-pressed={densidad === d}
              className={cn(
                "h-[30px] px-s2 font-mono text-[10px] uppercase transition",
                densidad === d
                  ? "bg-acc font-semibold text-acc-on"
                  : "bg-card-2 text-ink-2 hover:bg-fill",
              )}
            >
              {d.slice(0, 4)}
            </button>
          ))}
        </div>

        <div
          className="grid size-[30px] shrink-0 place-items-center rounded-full border border-line bg-fill text-xs font-semibold text-ink-2"
          title={`${usuario} · ${roles}`}
        >
          {iniciales}
        </div>

        <form action={salir}>
          <button className="h-[30px] rounded-r1 border border-line bg-card-2 px-s3 font-mono text-xs text-ink-2 hover:bg-fill">
            SALIR
          </button>
        </form>
      </div>
    </header>
  );
}
