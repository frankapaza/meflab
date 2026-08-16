import { z } from "zod";

/**
 * Esquemas de validación de usuario.
 *
 * Se usan en el servidor SIEMPRE, y en el formulario del cliente cuando
 * conviene dar feedback inmediato. La validación del cliente es cortesía;
 * la que cuenta es la del servidor, porque la acción se puede invocar sin
 * pasar por el formulario.
 */

export const ROLES = [
  "administrador",
  "gerencia",
  "lider_laboratorio",
  "recepcion",
  "lider_area",
  "tecnico",
] as const;

export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  gerencia: "Gerencia",
  lider_laboratorio: "Líder de Laboratorio",
  recepcion: "Recepción",
  lider_area: "Líder de Área",
  tecnico: "Técnico",
};

/** Qué hace cada rol, para que quien da de alta no tenga que adivinarlo. */
export const AYUDA_ROL: Record<Rol, string> = {
  administrador: "Configura el sistema: usuarios, catálogos, parámetros. Exige MFA.",
  gerencia: "Consulta indicadores y autoriza excepciones. Exige MFA.",
  lider_laboratorio: "Supervisa toda la producción y prioriza entre áreas.",
  recepcion: "Órdenes, entregas y atención. También facturación, caja y cobranza.",
  lider_area: "Planifica y asigna dentro de su área. No ve el trabajo de las demás.",
  tecnico: "Ejecuta etapas y registra sus tiempos.",
};

const email = z
  .string()
  .trim()
  .min(1, "El correo es obligatorio.")
  .email("Ese correo no tiene un formato válido.")
  .toLowerCase();

const nombre = z
  .string()
  .trim()
  .min(3, "El nombre completo es obligatorio.")
  .max(120, "El nombre es demasiado largo.");

/** RNF-003: mínimo 10 caracteres, igual que la configuración de Auth. */
const password = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(72, "La contraseña no puede pasar de 72 caracteres.");

const roles = z
  .array(z.enum(ROLES))
  .min(1, "Asigna al menos un rol: sin rol, la cuenta no ve nada.")
  // No hay tope: los permisos son la unión y el sponsor lleva dos.
  .refine((r) => new Set(r).size === r.length, "Hay un rol repetido.");

export const crearUsuarioSchema = z.object({
  nombre,
  email,
  password,
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  roles,
});

export const actualizarUsuarioSchema = z.object({
  usuarioId: z.string().uuid(),
  nombre,
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  roles,
});

export type CrearUsuario = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuario = z.infer<typeof actualizarUsuarioSchema>;

/** Roles que obligan a MFA (docs/03 §4). */
export const ROLES_CON_MFA: readonly Rol[] = ["administrador", "gerencia"];

export function exigeMfa(roles: readonly string[]): boolean {
  return roles.some((r) => ROLES_CON_MFA.includes(r as Rol));
}
