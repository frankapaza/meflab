"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";

/**
 * Los filtros viven en la URL, no en el estado del componente.
 *
 * Así una consulta concreta —«qué tocó Fulano en caja el martes»— se
 * puede copiar y pegar en un correo. Una auditoría que no se puede
 * compartir obliga a repetir la búsqueda delante de quien pregunta.
 */
export function Filtros({
  modulos,
  usuarios,
  actual,
}: {
  modulos: { id: string; nombre: string }[];
  usuarios: { id: string; nombre: string }[];
  actual: { modulo?: string; accion?: string; usuario?: string; desde?: string; hasta?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const idForm = useId();

  function fijar(clave: string, valor: string) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    router.push(`/auditoria?${p.toString()}`);
  }

  const hayFiltros = Boolean(
    actual.modulo || actual.accion || actual.usuario || actual.desde || actual.hasta,
  );

  return (
    <section className="flex flex-col gap-s3 rounded-r2 border border-line bg-card p-s4 shadow-e1">
      <div className="grid gap-s3 lg:grid-cols-5">
        <Campo etiqueta="Módulo" id={`${idForm}-mod`}>
          <select
            id={`${idForm}-mod`}
            value={actual.modulo ?? ""}
            onChange={(e) => fijar("modulo", e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            <option value="">Todos</option>
            {modulos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Acción" id={`${idForm}-acc`}>
          <select
            id={`${idForm}-acc`}
            value={actual.accion ?? ""}
            onChange={(e) => fijar("accion", e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            <option value="">Todas</option>
            <option value="INSERT">Altas</option>
            <option value="UPDATE">Cambios</option>
            <option value="DELETE">Bajas</option>
          </select>
        </Campo>

        <Campo etiqueta="Usuario" id={`${idForm}-usr`}>
          <select
            id={`${idForm}-usr`}
            value={actual.usuario ?? ""}
            onChange={(e) => fijar("usuario", e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          >
            <option value="">Cualquiera</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Desde" id={`${idForm}-desde`}>
          <input
            id={`${idForm}-desde`}
            type="date"
            value={actual.desde ?? ""}
            onChange={(e) => fijar("desde", e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          />
        </Campo>

        <Campo etiqueta="Hasta" id={`${idForm}-hasta`}>
          <input
            id={`${idForm}-hasta`}
            type="date"
            value={actual.hasta ?? ""}
            onChange={(e) => fijar("hasta", e.target.value)}
            className="h-[38px] w-full rounded-r1 border border-line bg-card-2 px-s2 text-base outline-none focus-visible:border-acc"
          />
        </Campo>
      </div>

      {hayFiltros ? (
        <button
          type="button"
          onClick={() => router.push("/auditoria")}
          className="self-start font-mono text-xs uppercase tracking-wide text-acc hover:underline"
        >
          Quitar todos los filtros
        </button>
      ) : null}
    </section>
  );
}

function Campo({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-s1">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-ink-2">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
