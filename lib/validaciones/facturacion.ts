import { z } from "zod";

/**
 * D-02 · La cuenta por cobrar nace del documento de venta, jamás del
 * trabajo. Este archivo valida lo que se emite; la CxC la crea la base en
 * la misma transacción.
 *
 * D-03 · Lo que MEFLAB almacena es valor de venta SIN IGV. El impuesto se
 * calcula al emitir, con la tasa vigente, y se congela en el documento:
 * si el IGV cambia por ley el año que viene, una factura ya emitida sigue
 * valiendo lo que valía.
 */

export const TIPOS_DOCUMENTO = [
  { valor: "factura", etiqueta: "Factura", requiereRuc: true },
  { valor: "boleta", etiqueta: "Boleta", requiereRuc: false },
] as const;

export const MEDIOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo", entraACaja: true },
  { valor: "transferencia", etiqueta: "Transferencia", entraACaja: false },
  { valor: "deposito", etiqueta: "Depósito", entraACaja: false },
  { valor: "yape_plin", etiqueta: "Yape / Plin", entraACaja: false },
  { valor: "tarjeta", etiqueta: "Tarjeta", entraACaja: false },
  { valor: "cheque", etiqueta: "Cheque", entraACaja: false },
  { valor: "otro", etiqueta: "Otro", entraACaja: false },
] as const;

/** Los cinco tramos del aging. Excluyentes y exhaustivos: cada deuda cae
 *  en uno y sólo uno, que es lo que hace que la suma cuadre al céntimo. */
export const TRAMOS = [
  { id: "por_vencer", etiqueta: "Por vencer", glifo: "●", vencido: false },
  { id: "1_30", etiqueta: "1 a 30 días", glifo: "◔", vencido: true },
  { id: "31_60", etiqueta: "31 a 60 días", glifo: "◑", vencido: true },
  { id: "61_90", etiqueta: "61 a 90 días", glifo: "◕", vencido: true },
  { id: "mas_90", etiqueta: "Más de 90 días", glifo: "▲", vencido: true },
] as const;

export type Tramo = (typeof TRAMOS)[number]["id"];

export const lineaDocumentoSchema = z.object({
  detalleTrabajoId: z.string().uuid().optional().or(z.literal("")),
  descripcion: z.string().trim().min(3, "Cada línea necesita una descripción."),
  cantidad: z.coerce.number().positive("La cantidad tiene que ser mayor que cero."),
  precioUnitario: z.coerce.number().min(0, "El precio no puede ser negativo."),
  afectacion: z.enum(["gravado", "exonerado", "inafecto"]).default("gravado"),
});

export const documentoSchema = z.object({
  clienteId: z.string().uuid("Elige el cliente al que se factura."),
  tipo: z.enum(["factura", "boleta"]),
  serie: z.string().trim().min(1, "Elige la serie."),
  diasCredito: z.coerce.number().int().min(0).max(180).optional(),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
  lineas: z.array(lineaDocumentoSchema).min(1, "Un documento sin líneas no es un documento."),
});

export type DatosDocumento = z.infer<typeof documentoSchema>;

export const pagoSchema = z.object({
  clienteId: z.string().uuid("Elige el cliente que paga."),
  importe: z.coerce.number().positive("El importe tiene que ser mayor que cero."),
  medio: z.enum([
    "efectivo", "transferencia", "deposito", "yape_plin", "tarjeta", "cheque", "otro",
  ]),
  referencia: z.string().trim().max(80).optional().or(z.literal("")),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
  aplicaciones: z.array(
    z.object({
      cuentaCobrarId: z.string().uuid(),
      importe: z.coerce.number().positive(),
    }),
  ).default([]),
});

export type DatosPago = z.infer<typeof pagoSchema>;

/**
 * Calcula los importes de un documento, por línea y redondeando por línea.
 *
 * El orden importa: sumar primero y redondear después da un céntimo
 * distinto que redondear cada línea y sumar. La base hace exactamente lo
 * mismo en `emitir_documento`, así que lo que se enseña antes de emitir es
 * lo que se va a emitir — no una aproximación.
 */
export function calcularImportes(
  lineas: readonly { cantidad: number; precioUnitario: number; afectacion?: string }[],
  tasaIgv: number,
): { subtotal: number; igv: number; total: number } {
  let subtotal = 0;
  let igv = 0;

  for (const l of lineas) {
    const sub = redondear(l.cantidad * l.precioUnitario);
    subtotal += sub;
    if ((l.afectacion ?? "gravado") === "gravado") igv += redondear(sub * tasaIgv);
  }

  subtotal = redondear(subtotal);
  igv = redondear(igv);
  return { subtotal, igv, total: redondear(subtotal + igv) };
}

function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Reparte un importe entre las deudas más antiguas primero.
 *
 * Es lo que hace un cajero a mano, y hacerlo mal tiene consecuencias: si
 * el pago se imputa a la factura más nueva, la vieja sigue envejeciendo y
 * el cliente entra en un tramo de mora que no le corresponde.
 */
export function repartirPago(
  importe: number,
  deudas: readonly { cuentaCobrarId: string; saldo: number; diasMora: number }[],
): { cuentaCobrarId: string; importe: number }[] {
  const orden = [...deudas].sort((a, b) => b.diasMora - a.diasMora);
  const reparto: { cuentaCobrarId: string; importe: number }[] = [];
  let restante = redondear(importe);

  for (const d of orden) {
    if (restante <= 0) break;
    const aplica = redondear(Math.min(restante, d.saldo));
    if (aplica > 0) {
      reparto.push({ cuentaCobrarId: d.cuentaCobrarId, importe: aplica });
      restante = redondear(restante - aplica);
    }
  }

  return reparto;
}

/** Lo que sobra tras repartir: es anticipo, saldo A FAVOR del cliente. */
export function anticipoDe(
  importe: number,
  reparto: readonly { importe: number }[],
): number {
  return redondear(importe - reparto.reduce((s, r) => s + r.importe, 0));
}

/**
 * Notas de crédito y débito.
 *
 * Una nota corrige un documento anterior: la de crédito rebaja lo que el
 * cliente debe (descuento, devolución, error de importe), la de débito lo
 * sube (intereses, un cargo que faltó).
 *
 * No generan cuenta por cobrar propia. Mueven la del documento que
 * corrigen — si crearan la suya, la misma venta contaría dos veces en la
 * cartera y H-01 volvería por la puerta de atrás.
 */
export const TIPOS_NOTA = [
  {
    valor: "nota_credito",
    etiqueta: "Nota de crédito",
    efecto: "Rebaja lo que el cliente debe",
    signo: -1,
  },
  {
    valor: "nota_debito",
    etiqueta: "Nota de débito",
    efecto: "Sube lo que el cliente debe",
    signo: 1,
  },
] as const;

export type TipoNota = (typeof TIPOS_NOTA)[number]["valor"];

/**
 * Los motivos que SUNAT tipifica. Se ofrece la lista y además texto
 * libre: obligar a elegir uno de un desplegable acaba con todo el mundo
 * eligiendo el primero.
 */
export const MOTIVOS_NOTA_CREDITO = [
  "Anulación de la operación",
  "Descuento por retraso o defecto",
  "Devolución total o parcial",
  "Error en el importe facturado",
  "Trabajo rehecho sin cargo",
] as const;

export const MOTIVOS_NOTA_DEBITO = [
  "Intereses por mora",
  "Aumento en el valor del trabajo",
  "Cargo no facturado en su momento",
  "Penalidad acordada",
] as const;

export const notaSchema = z.object({
  documentoRefId: z.string().uuid("Elige el documento que se corrige."),
  clienteId: z.string().uuid(),
  tipo: z.enum(["nota_credito", "nota_debito"]),
  serie: z.string().trim().min(1, "Elige la serie."),
  // SUNAT lo exige y el cliente lo pregunta. Una nota sin motivo es una
  // rebaja de deuda que nadie sabrá explicar dentro de seis meses.
  motivo: z.string().trim().min(5, "Escribe el motivo de la nota."),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
  lineas: z.array(lineaDocumentoSchema).min(1, "Una nota sin líneas no es una nota."),
});

export type DatosNota = z.infer<typeof notaSchema>;

/**
 * Cuánto queda debiéndose tras aplicar una nota.
 *
 * Se usa para AVISAR antes de emitir, no para decidir: la cifra buena la
 * calcula la base. Pero enseñar el resultado antes evita la nota de 5 000
 * que se quiso de 500.
 */
export function saldoTrasNota(
  saldoActual: number,
  totalNota: number,
  tipo: TipoNota,
): { saldo: number; aFavor: number } {
  if (tipo === "nota_debito") {
    return { saldo: redondear(saldoActual + totalNota), aFavor: 0 };
  }
  // Lo que excede de la deuda no desaparece: es dinero del cliente.
  return {
    saldo: redondear(Math.max(saldoActual - totalNota, 0)),
    aFavor: redondear(Math.max(totalNota - saldoActual, 0)),
  };
}


/**
 * Estado del comprobante ante SUNAT.
 *
 * Mientras no haya integración con un PSE, esto lo anota Administración a
 * mano con lo que le devuelve el sistema por el que emite. Los estados
 * son los mismos que usará la integración: registrar a mano ahora no es
 * un apaño desechable, es adelantar el modelo.
 */
export const ESTADOS_CPE = [
  {
    valor: "no_aplica",
    etiqueta: "No aplica",
    corto: "n/a",
    glifo: "·",
    ayuda: "No se declara electrónicamente.",
    clase: "border-line bg-card text-ink-3 hover:border-line-2",
  },
  {
    valor: "pendiente",
    etiqueta: "Pendiente de declarar",
    corto: "pendiente",
    glifo: "◔",
    ayuda: "Emitido en MEFLAB, aún no declarado.",
    clase: "border-warn bg-warn-bg text-warn",
  },
  {
    valor: "registrado_manual",
    etiqueta: "Declarado por fuera",
    corto: "manual",
    glifo: "✎",
    ayuda: "Se emitió en otro sistema y se anotó aquí.",
    clase: "border-line-2 bg-fill text-ink-2",
  },
  {
    valor: "aceptado",
    etiqueta: "Aceptado",
    corto: "aceptado",
    glifo: "■",
    ayuda: "SUNAT lo dio por bueno.",
    clase: "border-ok bg-ok-bg text-ok",
  },
  {
    valor: "rechazado",
    etiqueta: "Rechazado",
    corto: "rechazado",
    glifo: "▲",
    ayuda: "Hay que corregir y reenviar.",
    clase: "border-err bg-err-bg text-err",
  },
  {
    valor: "anulado_sunat",
    etiqueta: "Dado de baja",
    corto: "baja",
    glifo: "✕",
    ayuda: "Comunicado de baja ante SUNAT.",
    clase: "border-line bg-fill text-ink-3",
  },
] as const;

export type EstadoCpe = (typeof ESTADOS_CPE)[number]["valor"];
