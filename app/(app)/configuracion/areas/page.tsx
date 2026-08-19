import Link from "next/link";
import { redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Áreas y competencias · MEFLAB" };

/**
 * Las áreas no están pendientes por falta de tiempo: están esperando una
 * decisión del laboratorio (docs/04 §9.1). El esquema ya las lleva —cada
 * tabla de producción y de catálogo tiene su `area_id` desde la primera
 * migración— con un área única `GENERAL` por defecto.
 *
 * Esta pantalla lo dice en vez de dar un 404, porque la diferencia entre
 * "no se ha hecho" y "está esperando que decidas" es justo lo que el
 * sponsor necesita ver aquí.
 */
export default async function AreasPage() {
  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: areas }, { count: servicios }, { count: procesos }] = await Promise.all([
    supabase.from("area").select("id, codigo, nombre, es_default, activo").order("codigo"),
    supabase.from("servicio").select("*", { count: "exact", head: true }),
    supabase.from("proceso").select("*", { count: "exact", head: true }),
  ]);

  const lista = areas ?? [];

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-col gap-s1">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
          Configuración
        </span>
        <div className="flex flex-wrap items-center gap-s3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Áreas y competencias
          </h1>
          <span className="rounded-r1 bg-warn-bg px-s2 py-[3px] font-mono text-xs font-semibold text-warn">
            ▲ ESPERANDO UNA DECISIÓN
          </span>
        </div>
      </header>

      <div className="flex max-w-[760px] flex-col gap-s4 rounded-r2 border border-line bg-card p-s5 shadow-e1">
        <div className="flex flex-col gap-s2">
          <h2 className="text-xl font-semibold tracking-tight">
            Esto no está bloqueado por el desarrollo
          </h2>
          <p className="text-base leading-relaxed text-ink-2">
            El 16/08 se decidió arrancar <b className="font-semibold text-ink">sin
            áreas productivas</b> porque el laboratorio todavía no tiene claro
            cuántas hay: si CAD‑CAM es un área propia o vive dentro de Fija, y
            si la prótesis total va con la parcial o aparte.
          </p>
          <p className="text-base leading-relaxed text-ink-2">
            Mientras tanto todo cae en un área única llamada{" "}
            <b className="font-mono text-ink">GENERAL</b>, y nada en la
            interfaz pide un área. La configuración, el enrutamiento y el
            tablero por área están construidos en el prototipo y se activan
            cuando existan las áreas de verdad.
          </p>
        </div>

        {/* Que el esquema ya las lleve NO es un detalle: es lo que hace que
            activarlas después cueste una pantalla y no una migración de
            datos con reasignación a mano de cada registro. */}
        <div className="flex flex-col gap-s2 border-t border-line pt-s4">
          <h3 className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Lo que ya está hecho por debajo
          </h3>
          <ul className="flex flex-col gap-s1 text-base leading-relaxed text-ink-2">
            <li className="flex gap-s2">
              <span aria-hidden="true" className="shrink-0 font-mono text-ok">
                ■
              </span>
              Cada servicio, proceso, flujo, línea de trabajo, tarea y usuario
              lleva ya su <b className="font-mono text-ink">area_id</b>.
            </li>
            <li className="flex gap-s2">
              <span aria-hidden="true" className="shrink-0 font-mono text-ok">
                ■
              </span>
              La línea de la orden y la tarea heredan el área del servicio
              solas, sin preguntar nada.
            </li>
            <li className="flex gap-s2">
              <span aria-hidden="true" className="shrink-0 font-mono text-ok">
                ■
              </span>
              El Líder de Área ya tiene su regla de acceso: sólo ve lo de sus
              áreas, y eso lo aplica la base de datos.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-ink-3">
            Hoy son {servicios ?? 0} servicios y {procesos ?? 0} procesos
            apuntando a GENERAL. Definir las áreas después de cargar datos
            reales obligaría a reasignarlos a mano uno por uno; por eso la
            columna entró desde el primer día.
          </p>
        </div>

        <div className="flex flex-col gap-s2 border-t border-line pt-s4">
          <h3 className="font-mono text-xs uppercase tracking-wide text-ink-2">
            Qué hace falta para activarlas
          </h3>
          <p className="text-base leading-relaxed text-ink-2">
            Responder cuántas áreas productivas tiene el laboratorio.{" "}
            <b className="font-semibold text-ink">Límite: semana 12</b>, antes
            de cargar datos reales.
          </p>
          <p className="text-sm leading-relaxed text-ink-3">
            Las competencias de cada técnico —qué sabe hacer y a qué nivel—
            son la Fase 3 y dependen de esto mismo.
          </p>
        </div>
      </div>

      <div className="max-w-[760px] overflow-hidden rounded-r2 border border-line bg-card shadow-e1">
        <div className="border-b border-line bg-card-2 px-pad-x py-s3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
            Áreas configuradas
          </h2>
        </div>
        <ul className="flex flex-col">
          {lista.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-s3 border-b border-line px-pad-x py-s3 last:border-0"
            >
              <span className="font-mono text-sm text-ink-2">{a.codigo}</span>
              <span className="flex-1 text-base">{a.nombre}</span>
              {a.es_default ? (
                <span className="rounded-r1 bg-acc-bg px-s2 py-[2px] font-mono text-xs font-semibold text-acc">
                  POR DEFECTO
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-[760px] text-sm text-ink-3">
        El detalle de la decisión está en{" "}
        <span className="font-mono">docs/04-fases-y-mvp.md</span> §9.1. Los
        roles y sus permisos, en{" "}
        <Link href="/configuracion/usuarios" className="text-acc hover:underline">
          Usuarios y permisos
        </Link>
        .
      </p>
    </div>
  );
}
