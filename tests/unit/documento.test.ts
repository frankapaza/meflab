import { describe, expect, it } from "vitest";

import {
  soloDigitos,
  tipoContribuyente,
  validarDni,
  validarDocumento,
  validarRuc,
} from "@/lib/validaciones/documento";

/**
 * RUC calculados con el algoritmo oficial de SUNAT (módulo 11). Si alguno
 * de estos deja de pasar, el cálculo del verificador se rompió.
 */
const RUC_VALIDOS = [
  "20100070970", // persona jurídica
  "20512345671",
  "10456782341", // persona natural con negocio
];

describe("validarRuc", () => {
  it.each(RUC_VALIDOS)("acepta el RUC válido %s", (ruc) => {
    expect(validarRuc(ruc).ok).toBe(true);
  });

  it("rechaza si no tiene 11 dígitos", () => {
    expect(validarRuc("2051234567").ok).toBe(false);
    expect(validarRuc("205123456789").ok).toBe(false);
  });

  it("rechaza un prefijo que no existe", () => {
    // Un RUC sólo empieza por 10, 15, 17 o 20.
    const r = validarRuc("30512345678");
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("30");
  });

  it("detecta un dígito cambiado, que es el error real al teclear", () => {
    // Se cambia un dígito intermedio de un RUC válido: la longitud y el
    // prefijo siguen bien, sólo falla el verificador.
    const roto = "20512345665";
    expect(validarRuc(roto).ok).toBe(false);
    expect(validarRuc(roto).motivo).toContain("verificador");
  });

  it("ignora guiones y espacios al validar", () => {
    expect(validarRuc("20-512345671").ok).toBe(true);
    expect(validarRuc(" 20512345671 ").ok).toBe(true);
  });
});

describe("validarDni", () => {
  it("acepta 8 dígitos", () => {
    expect(validarDni("45871239").ok).toBe(true);
  });

  it("rechaza longitudes distintas de 8", () => {
    expect(validarDni("4587123").ok).toBe(false);
    expect(validarDni("458712399").ok).toBe(false);
  });

  it("rechaza el DNI de todo ceros", () => {
    expect(validarDni("00000000").ok).toBe(false);
  });
});

describe("validarDocumento", () => {
  it("aplica la regla que toca según el tipo", () => {
    expect(validarDocumento("RUC", "20512345671").ok).toBe(true);
    expect(validarDocumento("RUC", "45871239").ok).toBe(false);
    expect(validarDocumento("DNI", "45871239").ok).toBe(true);
  });

  it("con carné o pasaporte sólo exige una longitud mínima", () => {
    // No tienen formato fijo verificable: rechazarlos por no cuadrar con
    // un algoritmo inventado bloquearía clientes legítimos.
    expect(validarDocumento("CE", "001234567").ok).toBe(true);
    expect(validarDocumento("CE", "123").ok).toBe(false);
  });
});

describe("tipoContribuyente", () => {
  it("distingue persona jurídica de persona natural", () => {
    expect(tipoContribuyente("20512345671")).toBe("persona jurídica");
    expect(tipoContribuyente("10456782341")).toBe("persona natural con negocio");
  });

  it("devuelve null si el prefijo no es de RUC", () => {
    expect(tipoContribuyente("99512345678")).toBeNull();
  });
});

describe("soloDigitos", () => {
  it("normaliza para que las búsquedas cuadren", () => {
    // Guardar "20-51234567-1" y "20512345671" como cosas distintas haría
    // que el mismo cliente se registrara dos veces.
    expect(soloDigitos("20-51234567-1")).toBe("20512345671");
    expect(soloDigitos(" 4587 1239 ")).toBe("45871239");
  });
});
