import { z } from "zod";

/**
 * D-03 y D-07: lo que se ALMACENA es siempre valor de venta sin IGV. Lo
 * que cambia es cómo lo teclea el laboratorio, y eso es un atributo de la
 * LISTA de precios, no del servicio.
 *
 * La conversión la hace la base al guardar (`tg_normalizar_precio`). Aquí
 * sólo se valida y se calcula lo que se le va a enseñar al usuario, para
 * que vea antes de guardar qué cifra va a quedar almacenada.
 */

export const AFECTACIONES = [
  { valor: "gravado", etiqueta: "Gravado con IGV" },
  { valor: "exonerado", etiqueta: "Exonerado" },
  { valor: "inafecto", etiqueta: "Inafecto" },
] as const;

export type Afectacion = (typeof AFECTACIONES)[number]["valor"];

export const servicioSchema = z.object({
  servicioId: z.string().uuid().optional(),
  codigo: z
    .string()
    .trim()
    .min(2, "El código es obligatorio.")
    .max(20, "El código es demasiado largo.")
    // Viaja en la orden y en el comprobante: mejor sin espacios ni acentos.
    .regex(/^[A-Za-z0-9-]+$/, "El código admite letras, números y guiones."),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre del servicio es obligatorio.")
    .max(120, "El nombre es demasiado largo."),
  categoriaId: z.string().uuid().optional().or(z.literal("")),
  categoriaNueva: z.string().trim().max(60).optional().or(z.literal("")),
  precio: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo.")
    .max(999_999.99, "Ese precio es demasiado alto."),
  afectacion: z.enum(["gravado", "exonerado", "inafecto"]),
  // Sin flujo, una orden con este servicio entra en producción sin ninguna
  // tarea. Se permite guardarlo así —el catálogo se carga antes que los
  // flujos— pero la pantalla lo avisa.
  flujoId: z.string().uuid().optional().or(z.literal("")),
  activo: z.coerce.boolean().optional(),
});

export type DatosServicio = z.infer<typeof servicioSchema>;

/**
 * Lo que quedará almacenado a partir de lo tecleado.
 *
 * Espeja `normalizar_valor_venta` de la base a propósito: la base manda,
 * pero el usuario tiene que ver la cifra ANTES de guardar. Un precio mal
 * normalizado no falla — el laboratorio simplemente cobra un 18 % menos
 * durante meses sin que salte nada.
 */
export function valorVentaAlmacenado(
  precioTecleado: number,
  capturaConIgv: boolean,
  tasa = 0.18,
): number {
  const limpio = capturaConIgv ? precioTecleado / (1 + tasa) : precioTecleado;
  return Math.round(limpio * 100) / 100;
}

// No hay función para el camino inverso, y es deliberado: lo que se enseña
// al editar sale de `precio_capturado`, que es lo que el usuario tecleó de
// verdad. Reconstruirlo multiplicando por el IGV arrastra un céntimo de
// deriva en algunos importes, y ese céntimo acabaría guardado.
