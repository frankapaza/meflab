/**
 * Vocabulario de calidad: resultados, causas y políticas de garantía.
 *
 * La causa y la política son cosas DISTINTAS a propósito. La causa dice
 * de quién fue el fallo; la política, quién lo paga. Un laboratorio puede
 * cubrir por cortesía algo que técnicamente no le corresponde, y esa
 * decisión comercial tiene que poder verse aparte del diagnóstico
 * técnico — si no, «cubierto» acaba significando «fue culpa nuestra», que
 * es falso y desanima a registrarlo.
 */

export const RESULTADOS = {
  aprobado: { glifo: "■", etiqueta: "Aprobado", clase: "text-ok" },
  observado: { glifo: "◑", etiqueta: "Observado", clase: "text-warn" },
  rechazado: { glifo: "▲", etiqueta: "Rechazado", clase: "text-err" },
} as const;

export const CAUSAS = [
  {
    valor: "error_laboratorio",
    etiqueta: "Error del laboratorio",
    ayuda: "Lo hicimos mal nosotros.",
  },
  {
    valor: "error_impresion",
    etiqueta: "Impresión defectuosa",
    ayuda: "La impresión del doctor vino mal.",
  },
  {
    valor: "cambio_indicacion",
    etiqueta: "Cambio de indicación",
    ayuda: "El doctor cambió lo que había pedido.",
  },
  {
    valor: "material_defectuoso",
    etiqueta: "Material defectuoso",
    ayuda: "Reclamable al proveedor.",
  },
  {
    valor: "ajuste_clinico",
    etiqueta: "Ajuste clínico",
    ayuda: "Ajuste normal en boca; no es culpa de nadie.",
  },
  {
    valor: "sin_determinar",
    etiqueta: "Sin determinar",
    ayuda: "Todavía no se sabe.",
  },
] as const;

export const POLITICAS = [
  {
    valor: "cubierto",
    etiqueta: "Cubierto por garantía",
    ayuda: "Lo asume el laboratorio. No se le cobra nada al cliente.",
  },
  {
    valor: "parcial",
    etiqueta: "Parcial",
    ayuda: "Se comparte el costo: se le cobra una parte.",
  },
  {
    valor: "facturable",
    etiqueta: "Facturable",
    ayuda: "Lo paga el cliente entero.",
  },
] as const;

/**
 * Qué política sugiere una causa.
 *
 * Es una SUGERENCIA, no una regla: quien la cambie está tomando una
 * decisión comercial y debe poder hacerlo. Pero partir del vacío hace
 * que todo acabe marcado como «cubierto», que es lo cómodo en el momento
 * y lo caro a fin de mes.
 */
export function politicaSugerida(causa: string): string {
  switch (causa) {
    case "error_laboratorio":
    case "material_defectuoso":
      // El material defectuoso se le reclama al proveedor, no al doctor.
      return "cubierto";
    case "error_impresion":
    case "cambio_indicacion":
      return "facturable";
    case "ajuste_clinico":
      return "parcial";
    default:
      return "cubierto";
  }
}
