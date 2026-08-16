import { z } from "zod";

import { validarDocumento } from "./documento";

/**
 * D-01: el doctor es quien PIDE el trabajo; el cliente es a quien se
 * factura. Un doctor siempre pertenece a un cliente.
 *
 * Al registrarlo hay dos caminos, y la interfaz sólo enseña la decisión
 * que el usuario entiende —"¿trabaja en una clínica o por su cuenta?"—:
 *
 *   · pertenece a una clínica → se elige el cliente que ya existe
 *   · independiente          → el sistema crea su cliente por debajo
 */

export const ESPECIALIDADES = [
  "Rehabilitación oral",
  "Implantología",
  "Ortodoncia",
  "Estética dental",
  "Prótesis removible",
  "Odontopediatría",
  "Odontogeriatría",
  "Periodoncia",
  "Endodoncia",
  "Odontología general",
] as const;

const nombre = z
  .string()
  .trim()
  .min(3, "El nombre del doctor es obligatorio.")
  .max(120, "El nombre es demasiado largo.");

const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const base = {
  doctorId: z.string().uuid().optional(),
  nombre,
  colegiatura: opcional(30),
  especialidad: opcional(60),
  email: z.string().trim().email("Ese correo no es válido.").optional().or(z.literal("")),
  telefono: opcional(30),
  sedeEntrega: opcional(120),
};

/** Doctor que trabaja en una clínica ya registrada. */
export const doctorEnClinicaSchema = z.object({
  ...base,
  vinculo: z.literal("clinica"),
  clienteId: z.string().uuid("Elige la clínica a la que pertenece."),
});

/** Doctor por su cuenta: hay que crearle también su cliente. */
export const doctorIndependienteSchema = z
  .object({
    ...base,
    vinculo: z.literal("independiente"),
    tipoDocumento: z.enum(["RUC", "DNI", "CE", "PASAPORTE"]),
    numeroDocumento: z.string().trim().min(1, "El documento es obligatorio."),
    diasCredito: z.coerce.number().int().min(0).max(180),
    lineaCredito: z.coerce.number().min(0).max(999_999.99).optional(),
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
    // Misma regla que en cliente: crédito sin línea es crédito sin techo.
    if (d.diasCredito > 0 && (d.lineaCredito ?? 0) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lineaCredito"],
        message:
          "Si le das días de crédito, fija también su línea. " +
          "Sin línea no hay tope y el bloqueo por deuda nunca salta.",
      });
    }
  });

export const doctorSchema = z.discriminatedUnion("vinculo", [
  doctorEnClinicaSchema,
  doctorIndependienteSchema,
]);

export type DatosDoctor = z.infer<typeof doctorSchema>;
