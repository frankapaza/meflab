/**
 * Qué ve cada rol en su dashboard.
 *
 * No es una preferencia estética: el Gerente entra una o dos veces por
 * semana y desde el celular, y quiere cinco números; el responsable de
 * producción vive en el embudo y la carga. Enseñarles lo mismo obliga a
 * los dos a buscar lo suyo entre lo del otro, y en la práctica dejan de
 * mirar el dashboard.
 *
 * El usuario puede cambiar su selección; lo de aquí es de dónde parte.
 * Como un usuario tiene VARIOS roles (regla 10), la selección de entrada
 * es la UNIÓN de la de todos sus roles: nunca se le quita algo por sumar
 * un rol.
 */

export type Panel =
  | "dia"
  | "mes"
  | "serie"
  | "embudo"
  | "carga"
  | "doctores"
  | "puntualidad"
  | "capacidad"
  | "cartera"
  | "aging";

export const PANELES: { id: Panel; nombre: string; descripcion: string }[] = [
  { id: "dia", nombre: "Hoy", descripcion: "Recibidas, entregas, etapas y urgentes del día" },
  { id: "mes", nombre: "Este mes", descripcion: "Órdenes, valor de venta, en curso y atrasados" },
  { id: "serie", nombre: "Órdenes por día", descripcion: "Entrada de trabajo de los últimos 14 días" },
  { id: "embudo", nombre: "Embudo de producción", descripcion: "Dónde están los trabajos abiertos" },
  { id: "carga", nombre: "Carga por técnico", descripcion: "Horas sin terminar de cada uno" },
  { id: "doctores", nombre: "Doctores del mes", descripcion: "Por valor de venta pedido" },
  { id: "puntualidad", nombre: "Entregas a tiempo", descripcion: "Contra la fecha comprometida" },
  { id: "capacidad", nombre: "Capacidad utilizada", descripcion: "Horas comprometidas sobre la jornada" },
  { id: "cartera", nombre: "Cartera", descripcion: "Por cobrar y vencido, leídos de v_cartera" },
  { id: "aging", nombre: "Aging de la deuda", descripcion: "Cuánto se debe en cada tramo de mora" },
];

const POR_ROL: Record<string, Panel[]> = {
  // Cinco números y las alertas. Nada de detalle operativo.
  gerencia: ["mes", "serie", "doctores", "puntualidad", "cartera", "aging"],
  // Lo ve todo: es quien configura y quien responde de todo.
  administrador: [
    "dia", "mes", "serie", "embudo", "carga", "doctores", "puntualidad", "capacidad",
    "cartera", "aging",
  ],
  // El taller: qué entra, dónde se atasca y quién está cargado.
  lider_laboratorio: ["dia", "embudo", "carga", "capacidad", "puntualidad"],
  lider_area: ["dia", "embudo", "carga", "capacidad"],
  // El mostrador: qué entró hoy, qué se entrega y a quién se le debe una
  // respuesta. La carga del taller no es asunto suyo.
  recepcion: ["dia", "mes", "serie", "puntualidad", "doctores", "cartera"],
  // El técnico tiene "Mis tareas"; el dashboard sólo le sitúa.
  tecnico: ["dia", "embudo"],
};

/** El panel de entrada de alguien, sumando lo de todos sus roles. */
export function panelesPorDefecto(roles: readonly string[]): Panel[] {
  const suma = new Set<Panel>();
  for (const rol of roles) {
    for (const p of POR_ROL[rol] ?? []) suma.add(p);
  }
  // Alguien sin ningún rol conocido ve lo mínimo, no una pantalla vacía.
  if (suma.size === 0) return ["dia", "mes"];

  // Se devuelven en el orden de PANELES, no en el de los roles: el
  // dashboard tiene que verse igual siempre, sumen los roles que sumen.
  return PANELES.filter((p) => suma.has(p.id)).map((p) => p.id);
}

/** Lee la selección guardada, descartando lo que ya no existe. */
export function leerSeleccion(crudo: unknown, roles: readonly string[]): Panel[] {
  if (!Array.isArray(crudo)) return panelesPorDefecto(roles);

  const validos = new Set(PANELES.map((p) => p.id));
  const elegidos = crudo.filter((v): v is Panel => typeof v === "string" && validos.has(v as Panel));

  // Una selección vacía guardada es una selección: significa "no quiero
  // ver nada aquí", y hay que respetarla en vez de repoblarla.
  return PANELES.filter((p) => elegidos.includes(p.id)).map((p) => p.id);
}
