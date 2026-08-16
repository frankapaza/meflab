import { describe, expect, it } from "vitest";

import { doctorSchema } from "@/lib/validaciones/doctor";
import { normalizarDocumento } from "@/lib/validaciones/documento";

const EN_CLINICA = {
  vinculo: "clinica",
  clienteId: "b3f1c0a2-5d41-4a9e-9f2b-7c6d8e0a1b23",
  nombre: "Dr. Ramiro Jáuregui Ponce",
  colegiatura: "COP 24817",
  especialidad: "Rehabilitación oral",
  email: "rjauregui@sonrisaplena.pe",
  telefono: "987654321",
  sedeEntrega: "San Isidro, Lima",
};

const INDEPENDIENTE = {
  vinculo: "independiente",
  nombre: "Dra. Elsa Salcedo Peña",
  colegiatura: "COP 31204",
  especialidad: "Ortodoncia",
  email: "",
  telefono: "999888777",
  sedeEntrega: "",
  tipoDocumento: "RUC",
  numeroDocumento: "10456782341",
  diasCredito: 0,
};

const primerError = (datos: unknown) => {
  const r = doctorSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("doctorSchema", () => {
  it("acepta un doctor de una clínica ya registrada", () => {
    expect(doctorSchema.safeParse(EN_CLINICA).success).toBe(true);
  });

  it("acepta un doctor independiente con su documento", () => {
    expect(doctorSchema.safeParse(INDEPENDIENTE).success).toBe(true);
  });

  it("no guarda documento del doctor que pertenece a una clínica", () => {
    // Se factura a la clínica, así que el documento del doctor no hace
    // falta. Y si llegara por el formulario, se descarta: guardarlo abriría
    // una segunda identidad fiscal para un doctor que no la tiene.
    const r = doctorSchema.parse({
      ...EN_CLINICA,
      tipoDocumento: "DNI",
      numeroDocumento: "45871239",
    });
    expect(r).not.toHaveProperty("numeroDocumento");
  });

  it("acepta la edición de un doctor existente", () => {
    const r = doctorSchema.safeParse({
      ...EN_CLINICA,
      doctorId: "0a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d",
      nombre: "Dr. Ramiro Jáuregui P.",
    });
    expect(r.success).toBe(true);
  });

  it("exige elegir la clínica cuando el doctor pertenece a una", () => {
    const msg = primerError({ ...EN_CLINICA, clienteId: "" });
    expect(msg).toContain("clínica");
  });

  it("rechaza un RUC con el verificador cambiado", () => {
    expect(
      primerError({ ...INDEPENDIENTE, numeroDocumento: "10456782348" }),
    ).toContain("verificador");
  });

  it("exige línea de crédito si el independiente tiene días de crédito", () => {
    // Es la misma regla que en cliente, y por el mismo motivo: crédito sin
    // línea es crédito sin techo, y el bloqueo por deuda nunca saltaría.
    const msg = primerError({ ...INDEPENDIENTE, diasCredito: 30 });
    expect(msg).toContain("línea");
  });

  it("acepta el independiente a crédito si trae su línea", () => {
    const r = doctorSchema.safeParse({
      ...INDEPENDIENTE,
      diasCredito: 30,
      lineaCredito: 4500,
    });
    expect(r.success).toBe(true);
  });

  it("convierte los números que el formulario manda como texto", () => {
    const r = doctorSchema.parse({
      ...INDEPENDIENTE,
      diasCredito: "15",
      lineaCredito: "2500.50",
    });
    expect(r).toMatchObject({ diasCredito: 15, lineaCredito: 2500.5 });
  });

  it("exige un nombre de verdad", () => {
    expect(primerError({ ...EN_CLINICA, nombre: "Dr" })).toContain("obligatorio");
  });

  it("deja el correo vacío pasar, pero no uno mal escrito", () => {
    expect(doctorSchema.safeParse({ ...EN_CLINICA, email: "" }).success).toBe(true);
    expect(doctorSchema.safeParse({ ...EN_CLINICA, email: "arroba-no" }).success).toBe(
      false,
    );
  });

  it("distingue las dos ramas por el vínculo, no por lo que traiga", () => {
    // Sin un vínculo reconocible no hay forma de saber qué validar, y
    // dejarlo pasar significaría un doctor independiente sin cliente.
    expect(doctorSchema.safeParse({ ...EN_CLINICA, vinculo: "otro" }).success).toBe(
      false,
    );
  });
});

describe("normalizarDocumento", () => {
  it("quita guiones y espacios al RUC y al DNI", () => {
    // Si no, el mismo doctor entra dos veces con dos formatos y el índice
    // único de la base no lo impide.
    expect(normalizarDocumento("RUC", "20-51234567-1")).toBe("20512345671");
    expect(normalizarDocumento("DNI", "45 871 239")).toBe("45871239");
  });

  it("conserva las letras del carné de extranjería", () => {
    // Un CE puede llevar letras. Quitárselas lo convertiría en otro
    // documento distinto, guardado en silencio.
    expect(normalizarDocumento("CE", " a12345678 ")).toBe("A12345678");
  });
});
