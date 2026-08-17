import { describe, expect, it } from "vitest";

import { PANELES, leerSeleccion, panelesPorDefecto } from "@/lib/dominio/panel";

describe("panelesPorDefecto", () => {
  it("le da a Gerencia cinco números, no el detalle del taller", () => {
    // Entra una o dos veces por semana y desde el celular. Enseñarle la
    // carga por técnico le hace buscar lo suyo entre lo del otro.
    const g = panelesPorDefecto(["gerencia"]);
    expect(g).toContain("mes");
    expect(g).toContain("doctores");
    expect(g).not.toContain("carga");
    expect(g).not.toContain("capacidad");
  });

  it("le da al taller el embudo y la carga", () => {
    const l = panelesPorDefecto(["lider_laboratorio"]);
    expect(l).toContain("embudo");
    expect(l).toContain("carga");
    expect(l).toContain("capacidad");
  });

  it("SUMA los paneles de todos los roles, nunca los resta", () => {
    // Regla 10: los permisos son la unión. Sumar un rol no puede quitarle
    // a alguien un gráfico que ya veía.
    const gerencia = panelesPorDefecto(["gerencia"]);
    const ambos = panelesPorDefecto(["gerencia", "lider_laboratorio"]);
    for (const p of gerencia) expect(ambos).toContain(p);
    expect(ambos.length).toBeGreaterThan(gerencia.length);
  });

  it("mantiene el mismo orden sumen los roles que sumen", () => {
    // El dashboard tiene que verse igual siempre; si el orden dependiera
    // de los roles, dos personas verían lo mismo colocado distinto.
    const orden = PANELES.map((p) => p.id);
    const suma = panelesPorDefecto(["lider_laboratorio", "gerencia"]);
    const posiciones = suma.map((p) => orden.indexOf(p));
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it("un rol desconocido ve lo mínimo, no una pantalla vacía", () => {
    expect(panelesPorDefecto(["portal_cliente"])).toEqual(["dia", "mes"]);
    expect(panelesPorDefecto([])).toEqual(["dia", "mes"]);
  });
});

describe("leerSeleccion", () => {
  it("respeta una selección guardada", () => {
    expect(leerSeleccion(["embudo", "dia"], ["gerencia"])).toEqual(["dia", "embudo"]);
  });

  it("respeta la selección VACÍA", () => {
    // Vacío es una decisión —"no quiero ver nada aquí"— y hay que
    // distinguirlo de null, que es "nunca lo he tocado".
    expect(leerSeleccion([], ["administrador"])).toEqual([]);
  });

  it("vuelve a lo del rol cuando no hay nada guardado", () => {
    expect(leerSeleccion(null, ["gerencia"])).toEqual(panelesPorDefecto(["gerencia"]));
    expect(leerSeleccion(undefined, ["gerencia"])).toEqual(
      panelesPorDefecto(["gerencia"]),
    );
  });

  it("descarta lo que ya no existe sin tirar el resto", () => {
    // Si mañana se retira un gráfico, la preferencia guardada de quien lo
    // tenía no puede dejarle el dashboard roto.
    expect(leerSeleccion(["dia", "grafico-que-ya-no-existe", "mes"], [])).toEqual([
      "dia",
      "mes",
    ]);
  });
});
