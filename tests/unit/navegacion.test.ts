import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { navPara } from "@/lib/auth/navegacion";
import { permiteRuta } from "@/lib/auth/rutas";

const ROLES = [
  "administrador",
  "gerencia",
  "lider_laboratorio",
  "recepcion",
  "lider_area",
  "tecnico",
] as const;

/** Todas las rutas que algún rol puede ver en su menú. */
const rutasDelMenu = [
  ...new Set(
    ROLES.flatMap((rol) => navPara([rol]).flatMap((g) => g.items.map((i) => i.href))),
  ),
];

describe("el menú no lleva a ningún sitio roto", () => {
  it.each(rutasDelMenu)("%s tiene una página de verdad", (href) => {
    // Pasó de verdad: la barra lateral enseñaba Cobranza, Caja, Facturación,
    // Inventario, Compras, Reportes, Auditoría y Áreas, y las ocho daban el
    // 404 crudo de Next. Un enlace que lleva a un 404 parece un sistema
    // roto, no una fase pendiente — y eso es peor que no tener el enlace.
    const carpeta = href === "/" ? "" : href;
    // Se buscan las dos ubicaciones porque los grupos de rutas de Next no
    // salen en la URL: /tokens vive en app/tokens y no en app/(app)/tokens.
    const candidatas = [
      join(process.cwd(), "app", "(app)", carpeta, "page.tsx"),
      join(process.cwd(), "app", carpeta, "page.tsx"),
    ];
    expect(
      candidatas.some(existsSync),
      `ninguna de estas existe:\n${candidatas.join("\n")}`,
    ).toBe(true);
  });

  it("no deja ninguna pantalla construida fuera del menú", () => {
    // El otro lado del mismo problema: /produccion existía, funcionaba y no
    // estaba en el menú, así que sólo se llegaba tecleando la URL.
    const construidas = [
      "/",
      "/trabajos",
      "/produccion",
      "/produccion/mis-tareas",
      "/entregas",
      "/clientes",
      "/doctores",
      "/pacientes",
      "/configuracion",
      "/configuracion/listas",
      "/configuracion/produccion",
      "/configuracion/usuarios",
      "/configuracion/areas",
    ];
    for (const href of construidas) {
      expect(rutasDelMenu, `${href} no aparece en el menú de nadie`).toContain(href);
    }
  });

  it("cada ítem del menú lo puede abrir quien lo ve", () => {
    // El menú y la guarda salen de la misma función, así que no pueden
    // discrepar. Esto lo fija por si alguien las separa.
    for (const rol of ROLES) {
      for (const grupo of navPara([rol])) {
        for (const item of grupo.items) {
          expect(permiteRuta(item.href, [rol]), `${rol} ve ${item.href} y no entra`).toBe(
            true,
          );
        }
      }
    }
  });
});
