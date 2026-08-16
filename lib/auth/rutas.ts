/**
 * Qué rol puede entrar a qué ruta.
 *
 * Traduce la matriz de permisos de docs/05-actores-y-permisos.md §5. Es la
 * PRIMERA de tres barreras, y la más débil: sólo evita que alguien navegue
 * a una pantalla que no le toca.
 *
 * Las otras dos, que son las que de verdad protegen:
 *   2. la Server Action verifica el permiso antes de actuar
 *   3. RLS filtra las filas en la base
 *
 * Una ruta que falte aquí queda CERRADA, no abierta: `permiteRuta`
 * devuelve false para lo que no reconoce. Falla cerrado.
 */

export const RUTAS_PUBLICAS = ["/login", "/auth", "/sin-acceso"] as const;

/** Todos los roles internos. `portal_cliente` es externo y va aparte. */
const INTERNOS = [
  "administrador",
  "gerencia",
  "lider_laboratorio",
  "recepcion",
  "lider_area",
  "tecnico",
] as const;

/**
 * Prefijo de ruta → roles que pueden entrar. Se evalúa el prefijo más
 * largo que coincida, así `/produccion/tareas` puede ser más permisivo
 * que `/produccion`.
 */
const REGLAS: Record<string, readonly string[]> = {
  "/": INTERNOS,
  "/dashboard": INTERNOS,

  // Producción
  "/trabajos": INTERNOS,
  "/produccion": ["administrador", "gerencia", "lider_laboratorio", "lider_area", "tecnico"],
  "/produccion/mis-tareas": ["administrador", "lider_area", "tecnico"],
  "/entregas": ["administrador", "gerencia", "lider_laboratorio", "recepcion", "lider_area"],

  // Comercial
  "/clientes": ["administrador", "gerencia", "recepcion"],
  "/doctores": INTERNOS,
  "/pacientes": ["administrador", "gerencia", "lider_laboratorio", "recepcion", "lider_area", "tecnico"],

  // Dinero — Recepción absorbe facturación, caja y cobranza (AC-01 §4)
  "/facturacion": ["administrador", "gerencia", "recepcion"],
  "/pagos": ["administrador", "gerencia", "recepcion"],
  "/caja": ["administrador", "gerencia", "recepcion"],
  "/cobranzas": ["administrador", "gerencia", "recepcion"],

  // Almacén
  "/inventario": INTERNOS,
  "/compras": ["administrador", "gerencia", "lider_laboratorio", "lider_area"],

  // Análisis
  "/reportes": INTERNOS,

  // Configuración — sólo Administrador escribe; Gerencia consulta
  "/configuracion": ["administrador", "gerencia"],
  "/configuracion/usuarios": ["administrador"],
  "/configuracion/areas": ["administrador"],
  "/auditoria": ["administrador", "gerencia"],

  // Referencia de construcción, no una pantalla del producto
  "/tokens": INTERNOS,
};

export function permiteRuta(ruta: string, roles: readonly string[]): boolean {
  if (roles.length === 0) return false;

  // El prefijo más específico gana.
  //
  // Ojo con "/": tratarla como prefijo la haría coincidir con TODA ruta
  // (`"/lo-que-sea".startsWith("/")` es cierto) y cualquier ruta sin regla
  // quedaría abierta a todos los roles internos. Por eso "/" sólo casa
  // exacta. Es un fallo que ya se coló una vez.
  const regla = Object.keys(REGLAS)
    .filter((p) => (p === "/" ? ruta === "/" : ruta === p || ruta.startsWith(`${p}/`)))
    .sort((a, b) => b.length - a.length)[0];

  // Sin regla, no se pasa. Añadir una ruta obliga a declarar quién entra.
  if (!regla) return false;

  return REGLAS[regla].some((r) => roles.includes(r));
}
