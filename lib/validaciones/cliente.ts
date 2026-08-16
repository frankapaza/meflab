import { z } from "zod";

import { soloDigitos, validarDocumento } from "./documento";

/**
 * D-01: el CLIENTE es el sujeto comercial — a quien se factura, a quien se
 * fija la línea de crédito y a quien se cobra. El doctor es su contacto.
 *
 * Un doctor independiente se modela como un cliente con un único doctor
 * asociado. La interfaz oculta esa dualidad, pero la facturación la
 * necesita: sin sujeto comercial no hay comprobante.
 */

export const TIPOS_CLIENTE = ["clinica", "doctor_independiente"] as const;
export type TipoCliente = (typeof TIPOS_CLIENTE)[number];

export const ETIQUETA_TIPO: Record<TipoCliente, string> = {
  clinica: "Clínica",
  doctor_independiente: "Doctor independiente",
};

export const AYUDA_TIPO: Record<TipoCliente, string> = {
  clinica:
    "Persona jurídica con RUC. Agrupa varios doctores y una sola deuda: se factura a la clínica, no al doctor.",
  doctor_independiente:
    "Persona natural. Se le factura directamente. Podrás asociarle su ficha de doctor después.",
};

export const TIPOS_DOCUMENTO = ["RUC", "DNI", "CE", "PASAPORTE"] as const;

export const ETIQUETA_DOCUMENTO: Record<string, string> = {
  RUC: "RUC",
  DNI: "DNI",
  CE: "Carné de extranjería",
  PASAPORTE: "Pasaporte",
};

export const clienteSchema = z
  .object({
    clienteId: z.string().uuid().optional(),
    tipo: z.enum(TIPOS_CLIENTE),
    razonSocial: z
      .string()
      .trim()
      .min(3, "El nombre o razón social es obligatorio.")
      .max(160, "El nombre es demasiado largo."),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z.string().trim().min(1, "El documento es obligatorio."),
    direccion: z.string().trim().max(200).optional().or(z.literal("")),
    email: z.string().trim().email("Ese correo no es válido.").optional().or(z.literal("")),
    telefono: z.string().trim().max(30).optional().or(z.literal("")),
    diasCredito: z.coerce
      .number()
      .int("Los días de crédito son un número entero.")
      .min(0, "Los días de crédito no pueden ser negativos.")
      .max(180, "Más de 180 días de crédito hay que aprobarlo a mano."),
    lineaCredito: z.coerce
      .number()
      .min(0, "La línea de crédito no puede ser negativa.")
      .max(999_999.99, "Esa línea de crédito es demasiado alta.")
      .optional(),
    listaPrecioId: z.string().uuid().optional().or(z.literal("")),
  })
  // El documento se valida con su propia regla: el RUC lleva dígito
  // verificador y detectarlo aquí evita una factura rechazada por SUNAT.
  .superRefine((datos, ctx) => {
    const r = validarDocumento(datos.tipoDocumento, datos.numeroDocumento);
    if (!r.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: r.motivo ?? "El documento no es válido.",
      });
    }

    // Una clínica es persona jurídica: su RUC empieza por 20.
    if (
      datos.tipo === "clinica" &&
      datos.tipoDocumento === "RUC" &&
      !soloDigitos(datos.numeroDocumento).startsWith("20")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message:
          "El RUC de una clínica empieza por 20 (persona jurídica). " +
          "Si es una persona natural, marca «Doctor independiente».",
      });
    }

    // Vender a crédito sin línea es vender sin techo. Se avisa aquí y no
    // en el momento de bloquear la venta, que es tarde.
    if (datos.diasCredito > 0 && (datos.lineaCredito ?? 0) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lineaCredito"],
        message:
          "Si le das días de crédito, fija también su línea. " +
          "Sin línea no hay tope y el bloqueo por deuda nunca salta.",
      });
    }
  });

export type DatosCliente = z.infer<typeof clienteSchema>;
