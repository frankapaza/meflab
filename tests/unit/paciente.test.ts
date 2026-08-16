import { describe, expect, it } from "vitest";

import { edadEnAnios, pacienteSchema } from "@/lib/validaciones/paciente";

const SIMPLIFICADA = {
  ficha: "simplificada",
  nombre: "L. M. R.",
};

const COMPLETA = {
  ficha: "completa",
  nombre: "Lucía Mendoza Ríos",
  tipoDocumento: "DNI",
  numeroDocumento: "45871239",
  fechaNacimiento: "1990-05-14",
};

const primerError = (datos: unknown) => {
  const r = pacienteSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("pacienteSchema", () => {
  it("acepta una ficha simplificada con sólo el nombre", () => {
    // RN-002. Es el caso normal en el mostrador, no la excepción: si
    // exigiéramos documento, la orden se quedaría sin registrar.
    expect(pacienteSchema.safeParse(SIMPLIFICADA).success).toBe(true);
  });

  it("acepta iniciales como nombre de una ficha simplificada", () => {
    // Muchos doctores mandan el trabajo con las iniciales del paciente.
    expect(pacienteSchema.safeParse({ ...SIMPLIFICADA, nombre: "J.P." }).success).toBe(
      true,
    );
  });

  it("acepta una ficha completa con documento y nacimiento", () => {
    expect(pacienteSchema.safeParse(COMPLETA).success).toBe(true);
  });

  it("no pide documento a la ficha simplificada", () => {
    const r = pacienteSchema.parse(SIMPLIFICADA);
    expect(r).not.toHaveProperty("numeroDocumento");
  });

  it("exige documento a la ficha completa", () => {
    const msg = primerError({ ...COMPLETA, numeroDocumento: "" });
    expect(msg).toContain("obligatorio");
  });

  it("rechaza un DNI que no tiene 8 dígitos", () => {
    expect(primerError({ ...COMPLETA, numeroDocumento: "4587123" })).toContain("8 dígitos");
  });

  it("rechaza una fecha de nacimiento futura", () => {
    // Un dedazo en el año arrastra una edad negativa a todas las
    // pantallas que la muestren.
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(primerError({ ...COMPLETA, fechaNacimiento: manana })).toContain("futura");
  });

  it("rechaza un año anterior a 1900", () => {
    expect(primerError({ ...COMPLETA, fechaNacimiento: "1889-03-02" })).toContain("1900");
  });

  it("deja la fecha de nacimiento vacía pasar", () => {
    // Es opcional: orienta el tipo de trabajo, no identifica.
    expect(pacienteSchema.safeParse({ ...COMPLETA, fechaNacimiento: "" }).success).toBe(
      true,
    );
  });

  it("exige un nombre en cualquiera de las dos fichas", () => {
    expect(primerError({ ...SIMPLIFICADA, nombre: "L" })).toContain("obligatorio");
    expect(primerError({ ...COMPLETA, nombre: "" })).toContain("obligatorio");
  });

  it("distingue las dos fichas por el tipo, no por lo que traiga", () => {
    expect(pacienteSchema.safeParse({ ...COMPLETA, ficha: "otra" }).success).toBe(false);
  });
});

describe("edadEnAnios", () => {
  // Fecha fija: probar contra `hoy` real haría fallar la suite un día
  // concreto del año y pasar los otros 364.
  const HOY = new Date("2026-08-16T12:00:00");

  it("cuenta años cumplidos, no años transcurridos", () => {
    // Quien cumple mañana todavía no los ha cumplido. Restar los años a
    // secas le sumaría uno durante casi todo el año.
    expect(edadEnAnios("1996-08-17", HOY)).toBe(29);
  });

  it("cuenta el año el mismo día del cumpleaños", () => {
    expect(edadEnAnios("1986-08-16", HOY)).toBe(40);
  });

  it("cuenta bien cuando el cumpleaños ya pasó este año", () => {
    expect(edadEnAnios("1990-05-14", HOY)).toBe(36);
  });

  it("cuenta bien cuando el cumpleaños es de un mes posterior", () => {
    expect(edadEnAnios("1990-12-01", HOY)).toBe(35);
  });

  it("devuelve null si no hay fecha o no es válida", () => {
    expect(edadEnAnios(null, HOY)).toBeNull();
    expect(edadEnAnios("", HOY)).toBeNull();
    expect(edadEnAnios("no-es-fecha", HOY)).toBeNull();
  });
});
