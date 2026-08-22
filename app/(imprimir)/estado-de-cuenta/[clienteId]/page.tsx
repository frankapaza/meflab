import { notFound, redirect } from "next/navigation";

import { contextoActual } from "@/lib/auth/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { TRAMOS } from "@/lib/validaciones/facturacion";

import { BotonImprimir } from "../../comprobante/[id]/boton";

export const metadata = { title: "Estado de cuenta · MEFLAB" };

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

/**
 * El estado de cuenta de un cliente: qué debe, desde cuándo, y qué se ha
 * comprometido a pagar.
 *
 * Se imprime y se envía. Es el documento que zanja la conversación de
 * «pero yo ya te pagué eso»: si el laboratorio y el doctor miran el mismo
 * papel, con los mismos números y las mismas fechas, la discusión dura
 * cinco minutos en vez de una semana.
 *
 * Todo sale de `v_cartera`, igual que cobranza y el dashboard. Es la
 * cuarta pantalla que lee la misma fuente, y por eso las cuatro dicen lo
 * mismo (H-01).
 */
export default async function EstadoDeCuentaPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;

  const ctx = await contextoActual();
  if (!ctx) redirect("/login");

  const supabase = await crearClienteServidor();

  const { data: cliente } = await supabase
    .from("cliente")
    .select("id, razon_social, tipo_documento, numero_documento, direccion, dias_credito, linea_credito")
    .eq("id", clienteId)
    .maybeSingle();

  if (!cliente) notFound();

  const [{ data: cartera }, { data: anticipos }, { data: promesas }, { data: lab }] =
    await Promise.all([
      supabase
        .from("v_cartera")
        .select("cuenta_cobrar_id, documento, tipo_documento, fecha_emision, fecha_vencimiento, importe_original, saldo, dias_mora, tramo")
        .eq("cliente_id", clienteId)
        .order("dias_mora", { ascending: false }),
      // Saldo a favor: dinero del cliente que el laboratorio tiene sin
      // imputar. Va en el estado de cuenta porque si no, el cliente no se
      // entera de que tiene crédito y el laboratorio se lo queda.
      supabase
        .from("pago")
        .select("id, fecha, medio, importe, sin_aplicar, referencia")
        .eq("cliente_id", clienteId)
        .eq("anulado", false)
        .gt("sin_aplicar", 0)
        .order("fecha"),
      supabase
        .from("promesa_pago")
        .select("id, fecha_prometida, importe, estado")
        .eq("estado", "vigente")
        .eq("cliente_id", clienteId)
        .order("fecha_prometida"),
      supabase
        .from("sede")
        .select("direccion, tenant:tenant_id(nombre, ruc)")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);

  const filas = (cartera ?? []) as unknown as {
    cuenta_cobrar_id: string;
    documento: string;
    tipo_documento: string;
    fecha_emision: string;
    fecha_vencimiento: string;
    importe_original: number;
    saldo: number;
    dias_mora: number;
    tramo: string;
  }[];

  const total = filas.reduce((s, f) => s + Number(f.saldo), 0);
  const vencido = filas
    .filter((f) => f.tramo !== "por_vencer")
    .reduce((s, f) => s + Number(f.saldo), 0);

  const aFavor = ((anticipos ?? []) as { sin_aplicar: number }[]).reduce(
    (s, a) => s + Number(a.sin_aplicar),
    0,
  );

  const porTramo = TRAMOS.map((t) => ({
    ...t,
    saldo: filas
      .filter((f) => f.tramo === t.id)
      .reduce((s, f) => s + Number(f.saldo), 0),
  })).filter((t) => t.saldo > 0);

  const laboratorio = lab as unknown as {
    direccion: string | null;
    tenant: { nombre: string; ruc: string | null } | null;
  } | null;

  const hoy = new Date();

  return (
    <div className="mx-auto max-w-[860px] p-s6 print:max-w-none print:p-0">
      <div className="mb-s4 flex items-center justify-between gap-s3 print:hidden">
        <a href="/cobranzas" className="text-sm text-ink-2 underline">
          ← Volver a cobranza
        </a>
        <BotonImprimir />
      </div>

      <article className="flex flex-col gap-s4 rounded-r2 border border-line bg-card p-s6 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-s4 border-b border-line pb-s4">
          <div className="flex flex-col gap-s1">
            <span className="text-xl font-semibold tracking-tight">
              {laboratorio?.tenant?.nombre ?? "Laboratorio"}
            </span>
            {laboratorio?.tenant?.ruc ? (
              <span className="font-mono text-sm text-ink-2">
                RUC {laboratorio.tenant.ruc}
              </span>
            ) : null}
            {laboratorio?.direccion ? (
              <span className="max-w-[320px] text-sm leading-relaxed text-ink-2">
                {laboratorio.direccion}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-s1 text-right">
            <span className="font-mono text-sm font-semibold uppercase tracking-wide">
              Estado de cuenta
            </span>
            <span className="font-mono text-sm text-ink-2">
              Al {fecha.format(hoy)}
            </span>
          </div>
        </header>

        <section className="flex flex-col gap-s1">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
            Cliente
          </span>
          <span className="text-lg font-semibold">{cliente.razon_social}</span>
          <span className="font-mono text-sm text-ink-2">
            {cliente.tipo_documento} {cliente.numero_documento}
          </span>
          {cliente.direccion ? (
            <span className="text-sm leading-relaxed text-ink-2">{cliente.direccion}</span>
          ) : null}
          <span className="text-sm text-ink-3">
            {cliente.dias_credito > 0
              ? `Condiciones: crédito a ${cliente.dias_credito} días.`
              : "Condiciones: al contado."}
            {cliente.linea_credito
              ? ` Línea de crédito ${soles.format(Number(cliente.linea_credito))}.`
              : ""}
          </span>
        </section>

        {/* Los tres números que el doctor quiere ver de un vistazo. */}
        <div className="grid gap-s3 sm:grid-cols-3">
          <Kpi etiqueta="Total por cobrar" valor={soles.format(total)} destacado />
          <Kpi
            etiqueta="De eso, vencido"
            valor={soles.format(vencido)}
            nota={vencido > 0 ? "▲ requiere atención" : "■ nada vencido"}
          />
          <Kpi
            etiqueta="Saldo a su favor"
            valor={soles.format(aFavor)}
            nota={aFavor > 0 ? "se aplica a la próxima factura" : "sin saldo a favor"}
          />
        </div>

        {filas.length === 0 ? (
          <p className="rounded-r1 border border-dashed border-line-2 p-s6 text-center text-base text-ink-2">
            No hay ningún documento pendiente de pago. La cuenta está al día.
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-s2">
              <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">
                Documentos pendientes
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-y border-line text-left font-mono text-xs uppercase tracking-wide text-ink-3">
                    <th className="py-s2 font-medium">Documento</th>
                    <th className="py-s2 font-medium">Emitido</th>
                    <th className="py-s2 font-medium">Vence</th>
                    <th className="py-s2 text-right font-medium">Mora</th>
                    <th className="py-s2 text-right font-medium">Original</th>
                    <th className="py-s2 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => {
                    const tramo = TRAMOS.find((t) => t.id === f.tramo);
                    return (
                      <tr key={f.cuenta_cobrar_id} className="border-b border-line">
                        <td className="py-s2 pr-s3 font-mono text-sm">{f.documento}</td>
                        <td className="py-s2 pr-s3 font-mono text-sm tabular-nums text-ink-2">
                          {fecha.format(new Date(`${f.fecha_emision}T12:00:00`))}
                        </td>
                        <td className="py-s2 pr-s3 font-mono text-sm tabular-nums text-ink-2">
                          {fecha.format(new Date(`${f.fecha_vencimiento}T12:00:00`))}
                        </td>
                        {/* El glifo lleva el tramo: en una fotocopia en
                            gris, el color no dice nada. */}
                        <td className="py-s2 pr-s3 text-right font-mono text-sm tabular-nums">
                          <span aria-hidden="true">{tramo?.glifo}</span>{" "}
                          {Number(f.dias_mora) > 0
                            ? `${f.dias_mora} d`
                            : `en ${Math.abs(Number(f.dias_mora))} d`}
                        </td>
                        <td className="py-s2 pr-s3 text-right font-mono text-sm tabular-nums text-ink-2">
                          {soles.format(Number(f.importe_original))}
                        </td>
                        <td className="py-s2 text-right font-mono text-sm font-semibold tabular-nums">
                          {soles.format(Number(f.saldo))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="py-s3 pr-s3 text-right text-sm font-semibold">
                      Total por cobrar
                    </td>
                    <td className="py-s3 text-right font-mono text-lg font-semibold tabular-nums">
                      {soles.format(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="flex flex-col gap-s2">
              <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">
                Antigüedad de la deuda
              </h2>
              <dl className="flex flex-col gap-s1">
                {porTramo.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-baseline justify-between gap-s3 border-b border-line py-s1"
                  >
                    <dt className="text-sm">
                      <span aria-hidden="true">{t.glifo}</span> {t.etiqueta}
                    </dt>
                    <dd className="font-mono text-sm tabular-nums">
                      {soles.format(t.saldo)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}

        {(promesas ?? []).length > 0 ? (
          <section className="flex flex-col gap-s2">
            <h2 className="font-mono text-xs uppercase tracking-wide text-ink-3">
              Compromisos de pago vigentes
            </h2>
            <ul className="flex flex-col gap-s1">
              {((promesas ?? []) as { id: string; fecha_prometida: string; importe: number }[]).map(
                (p) => (
                  <li
                    key={p.id}
                    className="flex items-baseline justify-between gap-s3 border-b border-line py-s1 text-sm"
                  >
                    <span>
                      Pago comprometido para el{" "}
                      {fecha.format(new Date(`${p.fecha_prometida}T12:00:00`))}
                    </span>
                    <span className="font-mono tabular-nums">
                      {soles.format(Number(p.importe))}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>
        ) : null}

        <footer className="border-t border-line pt-s3 text-sm leading-relaxed text-ink-3">
          Documento informativo generado por MEFLAB. Si alguna cifra no
          coincide con sus registros, avísenos antes de la fecha de
          vencimiento: cuadrarlo ahora cuesta cinco minutos, y después de
          vencido, semanas.
        </footer>
      </article>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  nota,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-s1 rounded-r1 border p-s3 ${
        destacado ? "border-line-2" : "border-line"
      }`}
    >
      <span className="font-mono text-xs uppercase tracking-wide text-ink-3">
        {etiqueta}
      </span>
      <span className="text-xl font-semibold tabular-nums">{valor}</span>
      {nota ? <span className="font-mono text-xs text-ink-3">{nota}</span> : null}
    </div>
  );
}
