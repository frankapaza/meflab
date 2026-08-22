import { permiteRuta } from "./rutas";

/**
 * La barra lateral del prototipo, traducida a rutas reales.
 *
 * No lleva su propia lista de roles: pregunta a `permiteRuta`, que es la
 * misma función que usa `proxy.ts`. Así el menú y la guarda nunca pueden
 * discrepar — si un ítem aparece, la ruta se puede abrir; y al revés.
 */

export type ItemNav = {
  href: string;
  etiqueta: string;
  /** Marca de aviso, como el número de cobranzas vencidas. */
  aviso?: string;
  /** Fase en la que entra, según docs/04. Lo que no es MVP se marca. */
  fase?: "2" | "3" | "4";
};

export type GrupoNav = { grupo: string; items: ItemNav[] };

const NAV: GrupoNav[] = [
  {
    grupo: "INICIO",
    items: [{ href: "/", etiqueta: "Dashboard" }],
  },
  {
    grupo: "PRODUCCIÓN",
    items: [
      { href: "/trabajos", etiqueta: "Tablero" },
      // Estuvo construida y fuera del menú: se llegaba sólo tecleando la
      // URL. Una pantalla sin entrada en el menú no existe para quien la
      // necesita.
      { href: "/produccion", etiqueta: "Asignación de etapas" },
      { href: "/produccion/mis-tareas", etiqueta: "Mis tareas" },
      { href: "/calidad", etiqueta: "Control de calidad" },
      { href: "/entregas", etiqueta: "Entregas" },
    ],
  },
  {
    grupo: "COMERCIAL",
    items: [
      { href: "/clientes", etiqueta: "Clientes" },
      { href: "/doctores", etiqueta: "Doctores" },
      { href: "/pacientes", etiqueta: "Pacientes" },
    ],
  },
  {
    grupo: "DINERO",
    items: [
      { href: "/cobranzas", etiqueta: "Cobranza" },
      { href: "/caja", etiqueta: "Caja" },
      { href: "/facturacion", etiqueta: "Facturación" },
    ],
  },
  {
    grupo: "ALMACÉN",
    items: [
      { href: "/inventario", etiqueta: "Inventario" },
      { href: "/compras", etiqueta: "Compras", fase: "4" },
    ],
  },
  {
    grupo: "ANÁLISIS",
    items: [{ href: "/reportes", etiqueta: "Reportes", fase: "3" }],
  },
  {
    grupo: "CONFIGURACIÓN",
    items: [
      { href: "/configuracion", etiqueta: "Catálogo y tarifas" },
      { href: "/configuracion/listas", etiqueta: "Listas de precio" },
      { href: "/configuracion/produccion", etiqueta: "Procesos y flujos" },
      // Sin marca de fase a propósito: no está pendiente de construirse,
      // está esperando que el laboratorio decida cuántas áreas tiene.
      { href: "/configuracion/areas", etiqueta: "Áreas y competencias" },
      { href: "/configuracion/usuarios", etiqueta: "Usuarios y permisos" },
      { href: "/auditoria", etiqueta: "Auditoría" },
    ],
  },
  {
    grupo: "REFERENCIA",
    items: [{ href: "/tokens", etiqueta: "Sistema de diseño" }],
  },
];

/** El menú que le toca a un conjunto de roles. Los grupos vacíos se caen. */
export function navPara(roles: readonly string[]): GrupoNav[] {
  return NAV.map((g) => ({
    grupo: g.grupo,
    items: g.items.filter((i) => permiteRuta(i.href, roles)),
  })).filter((g) => g.items.length > 0);
}

/**
 * Etiqueta legible de cada rol, para la cabecera. El orden importa: se
 * muestra el más alto primero, que es como la gente se presenta.
 */
const ETIQUETAS: Record<string, string> = {
  administrador: "Administrador",
  gerencia: "Gerencia",
  lider_laboratorio: "Líder de Laboratorio",
  lider_area: "Líder de Área",
  recepcion: "Recepción",
  tecnico: "Técnico",
  portal_cliente: "Portal del doctor",
};

const ORDEN = Object.keys(ETIQUETAS);

export function rolesLegibles(roles: readonly string[]): string {
  return [...roles]
    .sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b))
    .map((r) => ETIQUETAS[r] ?? r)
    .join(" + ");
}

/** Iniciales para el avatar. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return (partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2)).toUpperCase();
}
