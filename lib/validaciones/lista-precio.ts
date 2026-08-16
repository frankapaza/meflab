import { z } from "zod";

/**
 * D-07: cada lista declara cómo se CAPTURAN sus precios. Lo almacenado es
 * siempre valor de venta sin IGV; el modo de captura sólo dice cómo lo
 * teclea y lo lee el laboratorio.
 *
 * Cambiar el modo de una lista NO cambia lo que vale un servicio: los
 * valores almacenados siguen siendo los mismos. Lo que cambia es la cifra
 * que se enseña. Es importante decirlo, porque al hacerlo todos los
 * precios de la pantalla saltan un 18 % y parece un error.
 */

export const listaPrecioSchema = z.object({
  listaId: z.string().uuid().optional(),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre de la lista es obligatorio.")
    .max(60, "El nombre es demasiado largo."),
  preciosIncluyenIgv: z.coerce.boolean(),
  esDefault: z.coerce.boolean(),
});

export type DatosListaPrecio = z.infer<typeof listaPrecioSchema>;

/** Una línea de la matriz de precios: un servicio dentro de una lista. */
export const precioItemSchema = z.object({
  servicioId: z.string().uuid(),
  /** Vacío significa "esta lista no fija precio": se usa el base del servicio. */
  precio: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), {
      message: "El precio no puede ser negativo.",
    }),
});

export type DatosPrecioItem = z.infer<typeof precioItemSchema>;

/**
 * Cuánto se aparta el precio de esta lista del precio base del servicio.
 *
 * Es el número que hace legible una lista: "Convenio A" no dice nada,
 * "12 % por debajo del tarifario" sí. Se calcula sobre valores de venta,
 * nunca sobre precios con IGV, para que el modo de captura no lo altere.
 */
export function variacionSobreBase(
  precioLista: number | null,
  precioBase: number,
): number | null {
  if (precioLista === null) return null;
  if (precioBase === 0) return null;
  return Math.round(((precioLista - precioBase) / precioBase) * 1000) / 10;
}
