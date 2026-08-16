import { describe, expect, it } from "vitest";

import {
  flujoSchema,
  horasDelFlujo,
  horasLegibles,
  procesoSchema,
} from "@/lib/validaciones/produccion";

const PROCESO = {
  codigo: "FRESADO",
  nombre: "Fresado / sinterizado",
  horasEstimadas: 3,
};

const primerError = (datos: unknown) => {
  const r = procesoSchema.safeParse(datos);
  return r.success ? null : r.error.issues[0].message;
};

describe("procesoSchema", () => {
  it("acepta un proceso bien definido", () => {
    expect(procesoSchema.safeParse(PROCESO).success).toBe(true);
  });

  it("acepta un proceso sin tiempo estimado", () => {
    // Hay pasos que no consumen taller —esperar la prueba en clínica— y
    // tienen que poder registrarse igual.
    expect(procesoSchema.safeParse({ ...PROCESO, horasEstimadas: 0 }).success).toBe(true);
  });

  it("rechaza horas negativas", () => {
    expect(primerError({ ...PROCESO, horasEstimadas: -1 })).toContain("negativas");
  });

  it("desconfía de una etapa de más de 80 horas", () => {
    // Casi siempre son minutos tecleados como horas, o una etapa que en
    // realidad son tres. Y arrastra la carga por técnico entera.
    expect(primerError({ ...PROCESO, horasEstimadas: 200 })).toContain("Revisa");
  });

  it("rechaza un código con espacios o acentos", () => {
    expect(primerError({ ...PROCESO, codigo: "FRESADO CAD" })).toContain("guiones");
  });

  it("convierte las horas que llegan del formulario como texto", () => {
    const r = procesoSchema.parse({ ...PROCESO, horasEstimadas: "1.25" });
    expect(r.horasEstimadas).toBe(1.25);
  });
});

describe("flujoSchema", () => {
  it("acepta un flujo con nombre", () => {
    expect(flujoSchema.safeParse({ nombre: "Corona de zirconio" }).success).toBe(true);
  });

  it("exige un nombre que distinga el flujo", () => {
    const r = flujoSchema.safeParse({ nombre: "AB" });
    expect(r.success).toBe(false);
  });
});

describe("horasDelFlujo", () => {
  it("suma las etapas", () => {
    expect(horasDelFlujo([1, 0.5, 1.5, 3, 0.75])).toBe(6.75);
  });

  it("un flujo sin etapas no estima nada", () => {
    expect(horasDelFlujo([])).toBe(0);
  });

  it("no arrastra el error de coma flotante", () => {
    // 0.1 + 0.2 da 0.30000000000000004 y eso acabaría en pantalla.
    expect(horasDelFlujo([0.1, 0.2])).toBe(0.3);
  });
});

describe("horasLegibles", () => {
  it("traduce los decimales a horas y minutos", () => {
    // 1.5 no es "1,5 horas" en el taller: es "1 h 30 min". Un decimal
    // obliga a traducir mentalmente cada vez que se lee una carga.
    expect(horasLegibles(1.5)).toBe("1 h 30 min");
    expect(horasLegibles(0.25)).toBe("15 min");
    expect(horasLegibles(3)).toBe("3 h");
  });

  it("no enseña un cero suelto", () => {
    expect(horasLegibles(0)).toBe("—");
  });

  it("redondea al minuto en lugar de arrastrar segundos", () => {
    expect(horasLegibles(0.51)).toBe("31 min");
  });
});
