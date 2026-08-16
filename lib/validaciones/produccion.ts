import { z } from "zod";

/**
 * D-04: el PROCESO es el paso (fresado, cerámica, acabado); el FLUJO es la
 * receta de un tipo de trabajo, o sea la secuencia de procesos.
 *
 * Cuando se registra una orden, el flujo del servicio se instancia en
 * tareas concretas. Sin eso el tablero es decorativo y los KPI 02, 08 y 09
 * no existen: un servicio sin flujo entra en producción sin nada que hacer.
 */

export const procesoSchema = z.object({
  procesoId: z.string().uuid().optional(),
  codigo: z
    .string()
    .trim()
    .min(2, "El código es obligatorio.")
    .max(20, "El código es demasiado largo.")
    .regex(/^[A-Za-z0-9-]+$/, "El código admite letras, números y guiones."),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre del proceso es obligatorio.")
    .max(80, "El nombre es demasiado largo."),
  horasEstimadas: z.coerce
    .number()
    .min(0, "Las horas no pueden ser negativas.")
    // Más de una jornada larga en UNA etapa casi siempre son minutos
    // tecleados como horas, o una etapa que en realidad son tres.
    .max(80, "¿80 horas en una sola etapa? Revisa el dato."),
  activo: z.coerce.boolean().optional(),
});

export type DatosProceso = z.infer<typeof procesoSchema>;

export const flujoSchema = z.object({
  flujoId: z.string().uuid().optional(),
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre del flujo es obligatorio.")
    .max(80, "El nombre es demasiado largo."),
  activo: z.coerce.boolean().optional(),
});

export type DatosFlujo = z.infer<typeof flujoSchema>;

/** Horas estimadas de un flujo: la suma de sus etapas. */
export function horasDelFlujo(horasPorEtapa: readonly number[]): number {
  const total = horasPorEtapa.reduce((a, b) => a + b, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Formatea horas como las dice un técnico.
 *
 * 1.5 no es "1,5 horas" en el taller, es "1 h 30 min". Un decimal obliga a
 * traducir mentalmente cada vez que se lee una carga de trabajo.
 */
export function horasLegibles(horas: number): string {
  if (horas === 0) return "—";

  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;

  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
