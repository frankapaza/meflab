import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";

import { enLetras } from "@/lib/dominio/letras";

import { BotonImprimir } from "./boton";

export const metadata = { title: "Comprobante · MEFLAB" };

const soles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const fecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

const NOMBRE_TIPO: Record<string, string> = {
  factura: "FACTURA ELECTRÓNICA",
  boleta: "BOLETA DE VENTA ELECTRÓNICA",
  nota_credito: "NOTA DE CRÉDITO ELECTRÓNICA",
  nota_debito: "NOTA DE DÉBITO ELECTRÓNICA",
};

/**
 * El comprobante en papel.
 *
 * Se imprime desde el navegador («Guardar como PDF»). No se genera el PDF
 * en el servidor a propósito: hacerlo obligaría a una librería de
 * maquetación y a mantener dos versiones del mismo documento, y hasta que
 * no esté la homologación con el PSE este papel es sólo para el cliente,
 * no para SUNAT.
 *
 * Cuando entre la facturación electrónica (2.9), el XML firmado lo emite
 * el PSE y esta página seguirá siendo la representación impresa.
 */
export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  // RLS decide si este documento es de su laboratorio. Aquí no se filtra
  // por tenant a mano: hacerlo daría una segunda regla que mantener.
  const { data: doc } = await supabase
    .from("documento_venta")
    .select(
      "id, numero, tipo, estado, fecha_emision, fecha_vencimiento, tasa_igv, subtotal, igv, total, motivo, observaciones, documento_ref_id, cliente:cliente_id(razon_social, tipo_documento, numero_documento, direccion), detalle:documento_detalle(descripcion, cantidad, precio_unitario, afectacion, subtotal, igv, total)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc) notFound();

  const [{ data: lab }, { data: corregido }] = await Promise.all([
    // La dirección es de la SEDE, no del laboratorio: un laboratorio con
    // dos locales emite desde uno concreto.
    supabase
      .from("sede")
      .select("direccion, tenant:tenant_id(nombre, ruc)")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    doc.documento_ref_id
      ? supabase
          .from("documento_venta")
          .select("numero")
          .eq("id", doc.documento_ref_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const laboratorio = lab as unknown as {
    direccion: string | null;
    tenant: { nombre: string; ruc: string | null } | null;
  } | null;
  const nombreLab = laboratorio?.tenant?.nombre ?? "Laboratorio";
  const rucLab = laboratorio?.tenant?.ruc ?? null;
  const dirLab = laboratorio?.direccion ?? null;

  const cliente = doc.cliente as unknown as {
    razon_social: string;
    tipo_documento: string | null;
    numero_documento: string;
    direccion: string | null;
  } | null;

  const lineas = (doc.detalle ?? []) as unknown as {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    afectacion: string;
    subtotal: number;
    igv: number;
    total: number;
  }[];

  const anulado = doc.estado === "anulado";

  return (
    <div className="mx-auto max-w-[820px] p-s6 print:max-w-none print:p-0">
      {/* Sólo en pantalla: en papel, un botón es una mancha de tinta. */}
      <div className="mb-s4 flex items-center justify-between gap-s3 print:hidden">
        <a href="/facturacion" className="text-sm text-ink-2 underline">
          ← Volver a facturación
        </a>
        <BotonImprimir />
      </div>

      <article className="flex flex-col gap-s4 rounded-r2 border border-line bg-card p-s6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {anulado ? (
          <p className="rounded-r1 border border-err bg-err-bg px-s3 py-s2 text-center font-mono text-sm font-semibold uppercase tracking-wide text-err">
            Documento anulado
          </p>
        ) : null}

        <header className="flex flex-wrap items-start justify-between gap-s4 border-b border-line pb-s4">
          <div className="flex flex-col gap-s1">
            <span className="text-xl font-semibold tracking-tight">
              {nombreLab}
            </span>
            {rucLab ? (
              <span className="font-mono text-sm text-ink-2">RUC {rucLab}</span>
            ) : null}
            {dirLab ? (
              <span className="max-w-[320px] text-sm leading-relaxed text-ink-2">
                {dirLab}
              </span>
            ) : null}
          </div>

          {/* El recuadro del número: es lo primero que busca quien recibe
              el papel, y lo que se dicta por teléfono. */}
          <div className="flex min-w-[240px] flex-col items-center gap-s1 rounded-r1 border-2 border-line p-s3 text-center">
            {rucLab ? (
              <span className="font-mono text-sm text-ink-2">RUC {rucLab}</span>
            ) : null}
            <span className="font-mono text-sm font-semibold uppercase tracking-wide">
              {NOMBRE_TIPO[doc.tipo] ?? doc.tipo}
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums">{doc.numero}</span>
          </div>
        </header>

        <section className="grid gap-s3 sm:grid-cols-2">
          <Dato etiqueta="Cliente" valor={cliente?.razon_social ?? "—"} />
          <Dato
            etiqueta={cliente?.tipo_documento ?? "Documento"}
            valor={cliente?.numero_documento ?? "—"}
          />
          <Dato etiqueta="Dirección" valor={cliente?.direccion ?? "—"} />
          <Dato
            etiqueta="Fecha de emisión"
            valor={fecha.format(new Date(`${doc.fecha_emision}T12:00:00`))}
          />
          <Dato
            etiqueta="Fecha de vencimiento"
            valor={fecha.format(new Date(`${doc.fecha_vencimiento}T12:00:00`))}
          />
          {corregido ? (
            <Dato etiqueta="Documento que modifica" valor={corregido.numero} />
          ) : null}
        </section>

        {doc.motivo ? (
          <p className="rounded-r1 border border-line bg-card-2 px-s3 py-s2 text-sm leading-relaxed">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
              Motivo
            </span>{" "}
            {doc.motivo}
          </p>
        ) : null}

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
              <th className="py-s2 font-medium">Descripción</th>
              <th className="py-s2 text-right font-medium">Cant.</th>
              <th className="py-s2 text-right font-medium">P. unit.</th>
              <th className="py-s2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-line">
                <td className="py-s2 pr-s3 text-sm leading-relaxed">
                  {l.descripcion}
                  {l.afectacion !== "gravado" ? (
                    <span className="ml-s2 font-mono text-xs uppercase text-ink-3">
                      ({l.afectacion})
                    </span>
                  ) : null}
                </td>
                <td className="py-s2 text-right font-mono text-sm tabular-nums">
                  {Number(l.cantidad)}
                </td>
                <td className="py-s2 text-right font-mono text-sm tabular-nums">
                  {soles.format(Number(l.precio_unitario))}
                </td>
                <td className="py-s2 text-right font-mono text-sm tabular-nums">
                  {soles.format(Number(l.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <dl className="flex w-full max-w-[300px] flex-col gap-s2">
            <Total etiqueta="Valor de venta" valor={soles.format(Number(doc.subtotal))} />
            <Total
              etiqueta={`IGV (${(Number(doc.tasa_igv) * 100).toFixed(0)} %)`}
              valor={soles.format(Number(doc.igv))}
            />
            <div className="border-t-2 border-line pt-s2">
              <Total
                etiqueta="Importe total"
                valor={soles.format(Number(doc.total))}
                destacado
              />
            </div>
          </dl>
        </div>

        <p className="text-sm leading-relaxed text-ink-2">
          Son: <b className="font-semibold">{enLetras(Number(doc.total))}</b>
        </p>

        {doc.observaciones ? (
          <p className="text-sm leading-relaxed text-ink-2">{doc.observaciones}</p>
        ) : null}

        <footer className="border-t border-line pt-s3 text-sm leading-relaxed text-ink-3">
          Representación impresa del comprobante. Mientras no esté la
          homologación con el proveedor de facturación electrónica, este
          documento es un control interno del laboratorio y no sustituye al
          comprobante que autoriza SUNAT.
        </footer>
      </article>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-base leading-relaxed">{valor}</span>
    </div>
  );
}

function Total({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-s3">
      <dt className={destacado ? "text-base font-semibold" : "text-sm text-ink-2"}>
        {etiqueta}
      </dt>
      <dd
        className={`font-mono tabular-nums ${destacado ? "text-lg font-semibold" : "text-base"}`}
      >
        {valor}
      </dd>
    </div>
  );
}
