import { z } from "zod";

import { validarDocumento } from "./documento";

/**
 * RN-002: el paciente admite ficha SIMPLIFICADA — sólo el nombre.
 *
 * No es una concesión, es el caso normal en el mostrador: el odontólogo
 * manda el trabajo con las iniciales del paciente o un código, y muchas
 * veces no da el documento. Exigirlo pararía el registro de la orden, y
 * una orden que no se registra acaba en el cuaderno.
 *
 * El documento sí se valida cuando lo hay: acaba en el comprobante.
 */

const nombre = z
  .string()
  .trim()
  .min(2, "El nombre del paciente es obligatorio.")
  .max(120, "El nombre es demasiado largo.");

const base = {
  pacienteId: z.string().uuid().optional(),
  nombre,
};

/** Sólo el nombre. Es lo que permite no frenar la recepción. */
export const pacienteSimplificadoSchema = z.object({
  ...base,
  ficha: z.literal("simplificada"),
});

export const pacienteCompletoSchema = z
  .object({
    ...base,
    ficha: z.literal("completa"),
    tipoDocumento: z.enum(["DNI", "CE", "PASAPORTE"]),
    numeroDocumento: z.string().trim().min(1, "El documento es obligatorio."),
    fechaNacimiento: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    const r = validarDocumento(d.tipoDocumento, d.numeroDocumento);
    if (!r.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: r.motivo ?? "El documento no es válido.",
      });
    }

    if (d.fechaNacimiento) {
      const f = new Date(`${d.fechaNacimiento}T00:00:00`);
      if (Number.isNaN(f.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaNacimiento"],
          message: "Esa fecha no existe.",
        });
        return;
      }
      // Una fecha futura es siempre un dedazo, y arrastra una edad
      // negativa a todas las pantallas que la muestren.
      if (f > new Date()) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaNacimiento"],
          message: "La fecha de nacimiento no puede ser futura.",
        });
      }
      if (f < new Date("1900-01-01T00:00:00")) {
        ctx.addIssue({
          code: "custom",
          path: ["fechaNacimiento"],
          message: "Revisa el año: es anterior a 1900.",
        });
      }
    }
  });

export const pacienteSchema = z.discriminatedUnion("ficha", [
  pacienteSimplificadoSchema,
  pacienteCompletoSchema,
]);

export type DatosPaciente = z.infer<typeof pacienteSchema>;

/**
 * Edad en años cumplidos a partir de la fecha de nacimiento.
 *
 * La calcula también la vista `v_paciente`, pero ahí queda tapada para
 * quien no debe verla. Esta es para la interfaz, cuando ya la recibió.
 */
export function edadEnAnios(
  fechaNacimiento: string | null,
  /** Fecha de referencia. Existe para poder probarla sin depender del día. */
  hoy: Date = new Date(),
): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return null;

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  // Si aún no llegó su cumpleaños este año, no los ha cumplido.
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;

  return edad >= 0 ? edad : null;
}
