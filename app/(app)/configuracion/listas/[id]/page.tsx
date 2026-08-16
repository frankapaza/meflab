import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { TablaTarifa, type FilaTarifa } from "./tabla-tarifa";

export const metadata = { title: "Tarifa · MEFLAB" };

type Servicio = {
  id: string;
  codigo: string;
  nombre: string;
  precio_base: number;
  categoria: { nombre: string } | null;
};

// Next 16: params es asíncrono.
export default async function TarifaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const [{ data: lista }, { data: servicios }, { data: items }, { data: config }] =
    await Promise.all([
      supabase
        .from("lista_precio")
        .select("id, nombre, precios_incluyen_igv, es_default, activo")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("servicio")
        .select("id, codigo, nombre, precio_base, categoria:categoria_id(nombre)")
        .eq("activo", true)
        .order("codigo"),
      supabase
        .from("lista_precio_item")
        .select("servicio_id, precio, precio_capturado")
        .eq("lista_precio_id", id),
      supabase.from("configuracion").select("valor").eq("clave", "igv").maybeSingle(),
    ]);

  // RLS ya filtró por laboratorio: si no aparece, no existe para este usuario.
  if (!lista) notFound();

  const tasaIgv = (config?.valor as { tasa?: number } | null)?.tasa ?? 0.18;

  const porServicio = new Map(
    (items ?? []).map((i) => [
      i.servicio_id,
      { venta: Number(i.precio), capturado: Number(i.precio_capturado) },
    ]),
  );

  const filas: FilaTarifa[] = ((servicios ?? []) as unknown as Servicio[]).map((s) => {
    const item = porServicio.get(s.id);
    return {
      servicioId: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      categoria: s.categoria?.nombre ?? null,
      precioBase: Number(s.precio_base),
      precioLista: item?.venta ?? null,
      precioCapturado: item?.capturado ?? null,
    };
  });

  const puedeEditar = ctx.roles.includes("administrador");

  return (
    <div className="flex flex-col gap-s4 p-s6">
      <header className="flex flex-wrap items-end justify-between gap-s4">
        <div className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
            <Link href="/configuracion/listas" className="hover:text-acc">
              Listas de precio
            </Link>
          </span>
          <div className="flex flex-wrap items-center gap-s3">
            <h1 className="text-2xl font-semibold tracking-tight">{lista.nombre}</h1>
            <span
              className={
                lista.precios_incluyen_igv
                  ? "rounded-r1 bg-warn-bg px-s2 py-[3px] font-mono text-xs font-semibold text-warn"
                  : "rounded-r1 bg-fill px-s2 py-[3px] font-mono text-xs text-ink-2"
              }
            >
              {lista.precios_incluyen_igv ? "CAPTURA CON IGV" : "CAPTURA SIN IGV"}
            </span>
            {lista.es_default ? (
              <span className="rounded-r1 bg-acc-bg px-s2 py-[3px] font-mono text-xs font-semibold text-acc">
                POR DEFECTO
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex items-start gap-s3 rounded-r1 border border-line border-l-2 border-l-acc bg-card p-s3">
        <span className="shrink-0 pt-[2px] font-mono text-xs uppercase tracking-wide text-ink-3">
          D-07
        </span>
        <p className="text-sm leading-relaxed text-ink-2">
          Los precios se teclean{" "}
          {lista.precios_incluyen_igv ? (
            <b className="font-semibold text-warn">con IGV incluido</b>
          ) : (
            <b className="font-semibold text-ink">sin IGV</b>
          )}
          , que es como está pactada esta lista. Lo que MEFLAB almacena es
          siempre valor de venta; la columna «Se guardará» enseña qué cifra va
          a quedar, antes de guardarla.
        </p>
      </div>

      {filas.length === 0 ? (
        <div className="grid min-h-[220px] place-items-center rounded-r2 border border-line bg-card p-s6">
          <div className="flex max-w-[420px] flex-col items-center gap-s3 text-center">
            <div className="grid size-[56px] place-items-center rounded-r3 border border-dashed border-line-2 text-2xl text-ink-3">
              ○
            </div>
            <h3 className="text-xl font-semibold tracking-tight">
              No hay servicios que tarifar
            </h3>
            <p className="text-base leading-relaxed text-ink-2">
              Una lista pone precio a servicios del catálogo. Da de alta los
              servicios primero.
            </p>
            <Link
              href="/configuracion"
              className="mt-s1 grid h-tap place-items-center rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on"
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      ) : (
        <TablaTarifa
          listaId={lista.id}
          filas={filas}
          capturaConIgv={lista.precios_incluyen_igv}
          tasaIgv={tasaIgv}
          puedeEditar={puedeEditar}
        />
      )}
    </div>
  );
}
