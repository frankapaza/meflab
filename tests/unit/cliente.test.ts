import { describe, expect, it } from "vitest";

import { clienteSchema } from "@/lib/validaciones/cliente";

const CLINICA = {
  tipo: "clinica",
  razonSocial: "Clínica Dental Sonrisa Plena",
  tipoDocumento: "RUC",
  numeroDocumento: "20512345671",
  direccion: "San Isidro, Lima",
  email: "contacto@sonrisaplena.pe",
  telefono: "987654321",
  diasCredito: 30,
  lineaCredito: 7500,
  listaPrecioId: "",
};

const primerError = (datos: unknown) => {
  const r = clienteSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("clienteSchema", () => {
  it("acepta una clínica bien registrada", () => {
    expect(clienteSchema.safeParse(CLINICA).success).toBe(true);
  });

  it("rechaza un RUC con el verificador mal", () => {
    // El error real al teclear: un dígito cambiado. Si pasa de aquí, llega
    // al comprobante electrónico y SUNAT lo rechaza.
    expect(primerError({ ...CLINICA, numeroDocumento: "20512345678" })).toContain(
      "verificador",
    );
  });

  it("exige que el RUC de una clínica sea de persona jurídica", () => {
    // Un RUC 10 es persona natural. Si el cliente es una clínica, o el
    // RUC está mal o el tipo está mal — y conviene decir cuál.
    const msg = primerError({ ...CLINICA, numeroDocumento: "10456782341" });
    expect(msg).toContain("empieza por 20");
    expect(msg).toContain("Doctor independiente");
  });

  it("acepta ese mismo RUC si es un doctor independiente", () => {
    const r = clienteSchema.safeParse({
      ...CLINICA,
      tipo: "doctor_independiente",
      razonSocial: "Dr. Luis Camacho Vidal",
      numeroDocumento: "10456782341",
    });
    expect(r.success).toBe(true);
  });

  it("exige línea de crédito si hay días de crédito", () => {
    // Vender a crédito sin línea es vender sin techo: el bloqueo por
    // deuda nunca saltaría.
    const msg = primerError({ ...CLINICA, lineaCredito: undefined });
    expect(msg).toContain("línea");
  });

  it("no exige línea si el cliente es al contado", () => {
    const r = clienteSchema.safeParse({
      ...CLINICA,
      diasCredito: 0,
      lineaCredito: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("convierte los números que llegan del formulario como texto", () => {
    // Un <input type=number> entrega string. Sin coerción, el esquema
    // rechazaría un formulario perfectamente válido.
    const r = clienteSchema.parse({
      ...CLINICA,
      diasCredito: "45" as unknown as number,
      lineaCredito: "12000.50" as unknown as number,
    });
    expect(r.diasCredito).toBe(45);
    expect(r.lineaCredito).toBe(12000.5);
  });

  it("pone tope a los días de crédito", () => {
    // Más de 180 días no es una condición comercial, es un error de dedo.
    expect(primerError({ ...CLINICA, diasCredito: 400 })).toContain("180");
  });

  it("rechaza días de crédito negativos", () => {
    expect(clienteSchema.safeParse({ ...CLINICA, diasCredito: -5 }).success).toBe(false);
  });

  it("acepta un DNI para un doctor independiente", () => {
    const r = clienteSchema.safeParse({
      ...CLINICA,
      tipo: "doctor_independiente",
      razonSocial: "Dra. Elsa Salcedo Peña",
      tipoDocumento: "DNI",
      numeroDocumento: "45871239",
      diasCredito: 0,
      lineaCredito: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("deja el correo vacío pasar, pero no uno mal escrito", () => {
    expect(clienteSchema.safeParse({ ...CLINICA, email: "" }).success).toBe(true);
    expect(clienteSchema.safeParse({ ...CLINICA, email: "sin-arroba" }).success).toBe(false);
  });
});
