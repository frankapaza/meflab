"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { buscar, type Hallazgo } from "@/app/(app)/buscar/acciones";
import { cn } from "@/lib/utils";

const ETIQUETA: Record<Hallazgo["tipo"], string> = {
  orden: "ORDEN",
  doctor: "DOCTOR",
  paciente: "PACIENTE",
  cliente: "CLIENTE",
};

/**
 * Buscador global.
 *
 * Recepción tiene que responder "¿cómo va mi trabajo?" en menos de diez
 * segundos, desde cualquier pantalla y con el doctor al teléfono. Por eso
 * se abre con ⌘K / Ctrl+K y busca a la vez órdenes, doctores, pacientes y
 * clientes: el doctor no llama diciendo el código de la orden.
 */
export function Buscador() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [termino, setTermino] = useState("");
  // Los resultados guardan de qué término son. Si no, al teclear una letra
  // más se enseñarían un instante los del término anterior, que ya no
  // valen — y con un buscador se decide rápido.
  const [resultado, setResultado] = useState<{ de: string; lista: Hallazgo[] }>({
    de: "",
    lista: [],
  });
  const [cargando, iniciar] = useTransition();
  const refEntrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto(true);
      }
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  useEffect(() => {
    if (abierto) refEntrada.current?.focus();
  }, [abierto]);

  const consulta = termino.trim();
  const buscable = consulta.length >= 2;

  useEffect(() => {
    if (!abierto || !buscable) return;
    // Se espera a que deje de teclear: una consulta por pulsación llena la
    // base de trabajo inútil y devuelve resultados que ya no interesan.
    const temporizador = setTimeout(() => {
      iniciar(async () => {
        const lista = await buscar(consulta);
        setResultado({ de: consulta, lista });
      });
    }, 200);
    return () => clearTimeout(temporizador);
  }, [consulta, buscable, abierto]);

  const hallazgos = resultado.de === consulta ? resultado.lista : [];

  const ir = (href: string) => {
    setAbierto(false);
    setTermino("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
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

      {abierto ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-s5 pt-[12vh]"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-label="Buscador"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-r2 border border-line bg-card shadow-e1"
          >
            <input
              ref={refEntrada}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Código de orden, doctor, paciente o cliente…"
              className="h-[52px] w-full border-b border-line bg-card px-s4 text-lg outline-none placeholder:text-ink-3"
            />

            <div className="max-h-[52vh] overflow-y-auto">
              {!buscable ? (
                <p className="p-s4 text-sm text-ink-3">
                  Escribe al menos dos letras. Busca por código de orden,
                  nombre del doctor, del paciente o del cliente.
                </p>
              ) : (cargando || resultado.de !== consulta) && hallazgos.length === 0 ? (
                <p className="p-s4 text-sm text-ink-3">Buscando…</p>
              ) : hallazgos.length === 0 ? (
                <p className="p-s4 text-sm text-ink-2">
                  Nada coincide con «{termino}».
                </p>
              ) : (
                <ul className="flex flex-col">
                  {hallazgos.map((h) => (
                    <li key={`${h.tipo}-${h.id}`}>
                      <button
                        onClick={() => ir(h.href)}
                        className={cn(
                          "flex w-full items-center gap-s3 border-b border-line px-s4 py-s3 text-left transition last:border-0",
                          "hover:bg-fill",
                        )}
                      >
                        <span className="w-[74px] shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                          {ETIQUETA[h.tipo]}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-base">{h.titulo}</span>
                          {h.detalle ? (
                            <span className="truncate text-sm text-ink-3">
                              {h.detalle}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
