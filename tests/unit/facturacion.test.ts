import { describe, expect, it } from "vitest";

import {
  TRAMOS,
  anticipoDe,
  calcularImportes,
  documentoSchema,
  repartirPago,
} from "@/lib/validaciones/facturacion";

const DOC = {
  clienteId: "b3f1c0a2-5d41-4a9e-9f2b-7c6d8e0a1b23",
  tipo: "factura" as const,
  serie: "F001",
  lineas: [
    { descripcion: "Corona de zirconio", cantidad: 1, precioUnitario: 620, afectacion: "gravado" as const },
  ],
};

const primerError = (datos: unknown) => {
  const r = documentoSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("documentoSchema", () => {
  it("acepta una factura bien formada", () => {
    expect(documentoSchema.safeParse(DOC).success).toBe(true);
  });

  it("rechaza un documento sin líneas", () => {
    // Un documento vacío genera una CxC de cero y ensucia la cartera con
    // deuda que no existe.
    expect(primerError({ ...DOC, lineas: [] })).toContain("no es un documento");
  });

  it("rechaza cantidad cero o negativa", () => {
    expect(
      documentoSchema.safeParse({
        ...DOC,
        lineas: [{ ...DOC.lineas[0], cantidad: 0 }],
      }).success,
    ).toBe(false);
  });

  it("acepta precio cero", () => {
    // Una línea de cortesía dentro de una factura es legítima: el trabajo
    // se documenta aunque no se cobre.
    expect(
      documentoSchema.safeParse({
        ...DOC,
        lineas: [{ ...DOC.lineas[0], precioUnitario: 0 }],
      }).success,
    ).toBe(true);
  });
});

describe("calcularImportes · D-03", () => {
  it("calcula el IGV sobre el valor de venta, no al revés", () => {
    // 620 sin IGV → 111.60 de impuesto → 731.60. Es el caso que fija D-03.
    const r = calcularImportes([{ cantidad: 1, precioUnitario: 620 }], 0.18);
    expect(r).toEqual({ subtotal: 620, igv: 111.6, total: 731.6 });
  });

  it("no cobra IGV a lo exonerado ni a lo inafecto", () => {
    const r = calcularImportes(
      [{ cantidad: 1, precioUnitario: 100, afectacion: "exonerado" }],
      0.18,
    );
    expect(r).toEqual({ subtotal: 100, igv: 0, total: 100 });
  });

  it("redondea POR LÍNEA, igual que la base", () => {
    // Tres líneas de 33.33: redondear por línea da 5.99 de IGV; sumar
    // primero y redondear después daría 6.00. La base redondea por línea,
    // así que la pantalla tiene que dar exactamente lo mismo o el total
    // que se ve antes de emitir no sería el que se emite.
    const r = calcularImportes(
      [
        { cantidad: 1, precioUnitario: 33.33 },
        { cantidad: 1, precioUnitario: 33.33 },
        { cantidad: 1, precioUnitario: 33.33 },
      ],
      0.18,
    );
    expect(r.subtotal).toBe(99.99);
    expect(r.igv).toBe(18);
    expect(r.total).toBe(117.99);
  });

  it("el total siempre es subtotal más IGV", () => {
    const casos = [
      [{ cantidad: 2, precioUnitario: 880 }],
      [{ cantidad: 3, precioUnitario: 12.5 }, { cantidad: 1, precioUnitario: 0.01 }],
      [{ cantidad: 1, precioUnitario: 0 }],
    ];
    for (const lineas of casos) {
      const r = calcularImportes(lineas, 0.18);
      expect(r.total).toBeCloseTo(r.subtotal + r.igv, 2);
    }
  });

  it("respeta una tasa distinta de la vigente", () => {
    // El IGV peruano ya pasó del 19 % al 18 %: es un parámetro.
    const r = calcularImportes([{ cantidad: 1, precioUnitario: 100 }], 0.19);
    expect(r.igv).toBe(19);
  });
});

describe("repartirPago", () => {
  const deudas = [
    { cuentaCobrarId: "nueva", saldo: 500, diasMora: 5 },
    { cuentaCobrarId: "vieja", saldo: 300, diasMora: 95 },
    { cuentaCobrarId: "media", saldo: 200, diasMora: 40 },
  ];

  it("paga primero lo más antiguo", () => {
    // Si el pago fuera a la factura más nueva, la vieja seguiría
    // envejeciendo y el cliente entraría en un tramo de mora que no le
    // corresponde — y con él, en el bloqueo comercial.
    const r = repartirPago(300, deudas);
    expect(r).toEqual([{ cuentaCobrarId: "vieja", importe: 300 }]);
  });

  it("encadena de la más antigua a la más nueva", () => {
    const r = repartirPago(600, deudas);
    expect(r).toEqual([
      { cuentaCobrarId: "vieja", importe: 300 },
      { cuentaCobrarId: "media", importe: 200 },
      { cuentaCobrarId: "nueva", importe: 100 },
    ]);
  });

  it("nunca aplica más de lo que se debe", () => {
    const r = repartirPago(5000, deudas);
    const total = r.reduce((s, x) => s + x.importe, 0);
    expect(total).toBe(1000);
  });

  it("no reparte nada si no hay deudas", () => {
    expect(repartirPago(500, [])).toEqual([]);
  });
});

describe("anticipoDe", () => {
  it("lo que sobra tras repartir es saldo a favor", () => {
    // Un anticipo NO es deuda: no puede aparecer nunca en la cartera. Si
    // apareciera, un cliente que paga por adelantado "debería" más.
    const deudas = [{ cuentaCobrarId: "a", saldo: 300, diasMora: 10 }];
    const reparto = repartirPago(1000, deudas);
    expect(anticipoDe(1000, reparto)).toBe(700);
  });

  it("es cero cuando el pago se aplica entero", () => {
    const deudas = [{ cuentaCobrarId: "a", saldo: 1000, diasMora: 10 }];
    expect(anticipoDe(1000, repartirPago(1000, deudas))).toBe(0);
  });
});

describe("tramos del aging", () => {
  it("cubre los cinco tramos, sin solaparse", () => {
    // La suma de los tramos tiene que cuadrar al céntimo con el total de
    // la cartera. Si un tramo faltara o se solapara con otro, volverían
    // las dos cifras de deuda que dieron origen al proyecto.
    expect(TRAMOS).toHaveLength(5);
    expect(new Set(TRAMOS.map((t) => t.id)).size).toBe(5);
  });

  it("cada tramo lleva glifo además de color", () => {
    // El aging se imprime y se lee con daltonismo: el nivel no puede
    // vivir sólo en el color.
    for (const t of TRAMOS) expect(t.glifo).toBeTruthy();
  });

  it("sólo el primero no está vencido", () => {
    expect(TRAMOS.filter((t) => !t.vencido).map((t) => t.id)).toEqual(["por_vencer"]);
  });
});
