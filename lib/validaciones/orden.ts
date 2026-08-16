import { z } from "zod";

/**
 * M-08: la pieza dental se registra en notación FDI, no como texto libre.
 *
 * El error de transcripción de la pieza es la causa más común de retrabajo
 * por "información incorrecta" (RF-071): una corona fabricada para el 16
 * cuando iba al 26 se tira entera. Por eso se elige en un odontograma y se
 * valida también en la base.
 */

/** Cuadrantes FDI de adulto: 1 y 2 arriba, 3 y 4 abajo. */
export const CUADRANTES = [
  { id: 1, arcada: "superior", lado: "derecho" },
  { id: 2, arcada: "superior", lado: "izquierdo" },
  { id: 3, arcada: "inferior", lado: "izquierdo" },
  { id: 4, arcada: "inferior", lado: "derecho" },
] as const;

/** Las 32 piezas permanentes, en el orden en que se dibuja la boca. */
export function piezasDelCuadrante(cuadrante: number): string[] {
  return Array.from({ length: 8 }, (_, i) => `${cuadrante}${i + 1}`);
}

export function esPiezaValida(pieza: string): boolean {
  return /^[1-4][1-8]$/.test(pieza);
}

/** De qué arcada es una pieza. Se deduce, no se pregunta. */
export function arcadaDePieza(pieza: string): "superior" | "inferior" | null {
  if (!esPiezaValida(pieza)) return null;
  return pieza[0] === "1" || pieza[0] === "2" ? "superior" : "inferior";
}

/**
 * La arcada de un conjunto de piezas.
 *
 * Si hay piezas de arriba y de abajo, es "ambas": no se elige a mano,
 * porque el dato ya está en las piezas y dos formas de decir lo mismo
 * acaban discrepando.
 */
export function arcadaDePiezas(piezas: readonly string[]): string | null {
  const arcadas = new Set(piezas.map(arcadaDePieza).filter(Boolean));
  if (arcadas.size === 0) return null;
  if (arcadas.size === 2) return "ambas";
  return [...arcadas][0] as string;
}

export const PRIORIDADES = [
  { valor: "normal", etiqueta: "Normal" },
  { valor: "urgente", etiqueta: "Urgente" },
] as const;

export const TIPOS_RECEPCION = [
  { valor: "impresion_fisica", etiqueta: "Impresión física" },
  { valor: "archivo_stl", etiqueta: "Archivo STL" },
  { valor: "modelo", etiqueta: "Modelo" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

export const lineaOrdenSchema = z.object({
  servicioId: z.string().uuid("Elige un servicio."),
  cantidad: z.coerce
    .number()
    .positive("La cantidad tiene que ser mayor que cero.")
    .max(99, "¿99 unidades del mismo trabajo? Revisa el dato."),
  piezasFdi: z.array(z.string().regex(/^[1-4][1-8]$/, "Pieza fuera de la notación FDI.")),
  colorId: z.string().uuid().optional().or(z.literal("")),
});

export type LineaOrden = z.infer<typeof lineaOrdenSchema>;

export const ordenSchema = z
  .object({
    clienteId: z.string().uuid("Elige el cliente al que se factura."),
    doctorId: z.string().uuid("Elige el doctor que pide el trabajo."),
    pacienteId: z.string().uuid("Elige el paciente."),
    fechaComprometida: z.string().min(1, "La fecha comprometida es obligatoria."),
    prioridad: z.enum(["normal", "urgente"]),
    tipoRecepcion: z.enum(["impresion_fisica", "archivo_stl", "modelo", "otro"]),
    indicaciones: z.string().trim().max(2000).optional().or(z.literal("")),
    lineas: z.array(lineaOrdenSchema).min(1, "Una orden sin trabajos no es una orden."),
  })
  .superRefine((d, ctx) => {
    const fecha = new Date(`${d.fechaComprometida}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaComprometida"],
        message: "Esa fecha no existe.",
      });
      return;
    }

    // Comprometer una fecha ya pasada es prometer algo imposible, y el
    // semáforo nacería en rojo.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha < hoy) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaComprometida"],
        message: "La fecha comprometida no puede estar en el pasado.",
      });
    }
  });

export type DatosOrden = z.infer<typeof ordenSchema>;

/**
 * Días hábiles entre hoy y la fecha comprometida.
 *
 * Se cuentan hábiles porque el laboratorio no produce en domingo: decir
 * "faltan 3 días" cuando dos son fin de semana promete lo que no se puede
 * cumplir.
 */
export function diasHabilesHasta(fecha: string, desde: Date = new Date()): number | null {
  const objetivo = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(objetivo.getTime())) return null;

  const inicio = new Date(desde);
  inicio.setHours(0, 0, 0, 0);

  if (objetivo <= inicio) return 0;

  let habiles = 0;
  const cursor = new Date(inicio);
  while (cursor < objetivo) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0) habiles += 1;
  }
  return habiles;
}
