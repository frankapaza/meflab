"use client";

import { useSyncExternalStore } from "react";

/**
 * Tema (claro/oscuro) y densidad (compacto/normal/amplio).
 *
 * Dos reglas que vienen del prototipo y no son negociables:
 *
 *  1. La clase del tema va en <html>, no en un div. `body` pinta el fondo
 *     detrás de todo y lee de :root; con la clase en un subárbol aparece
 *     una banda clara detrás de la interfaz oscura.
 *  2. La densidad va en el contenedor de la app, no en <html>. Así una
 *     pantalla concreta puede forzar la suya — la del técnico se ve
 *     siempre en amplio, con guantes puestos y a un brazo de distancia.
 *
 * La preferencia vive en localStorage, que es un sistema EXTERNO a React.
 * Por eso se lee con `useSyncExternalStore` y no con useState+useEffect:
 * eso último dispara un render en cascada en cada carga, y React lo avisa.
 */

export type Tema = "claro" | "oscuro";
export type Densidad = "compacto" | "normal" | "amplio";

const CLAVE_TEMA = "meflab.tema";
const CLAVE_DENSIDAD = "meflab.densidad";

// ── almacén mínimo sobre localStorage ─────────────────────────────────
const oyentes = new Set<() => void>();

function suscribir(cb: () => void) {
  oyentes.add(cb);
  // `storage` sólo dispara en OTRAS pestañas: mantiene la app coherente
  // si alguien cambia el tema en una segunda ventana.
  window.addEventListener("storage", cb);
  return () => {
    oyentes.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function avisar() {
  for (const cb of oyentes) cb();
}

function leer<T extends string>(clave: string, porDefecto: T): T {
  try {
    return (localStorage.getItem(clave) as T | null) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Modo incógnito o almacenamiento lleno: la preferencia no persiste,
    // pero la sesión sigue funcionando. No es motivo para romper nada.
  }
  avisar();
}

export function useTema() {
  const tema = useSyncExternalStore(
    suscribir,
    () => leer<Tema>(CLAVE_TEMA, "claro"),
    // En el servidor no hay localStorage. Se devuelve el valor por defecto
    // y el script de app/layout.tsx evita el parpadeo antes de hidratar.
    () => "claro" as Tema,
  );

  const densidad = useSyncExternalStore(
    suscribir,
    () => leer<Densidad>(CLAVE_DENSIDAD, "normal"),
    () => "normal" as Densidad,
  );

  return {
    tema,
    densidad,
    alternarTema: () => {
      const siguiente: Tema = tema === "claro" ? "oscuro" : "claro";
      document.documentElement.classList.toggle("dark", siguiente === "oscuro");
      escribir(CLAVE_TEMA, siguiente);
    },
    cambiarDensidad: (d: Densidad) => escribir(CLAVE_DENSIDAD, d),
  };
}

/**
 * Aplica el tema guardado ANTES de que el navegador pinte. Sin esto, quien
 * tenga el tema oscuro ve un fogonazo blanco en cada carga. Va inline a
 * propósito: cualquier otra vía llega tarde.
 */
export const SCRIPT_SIN_PARPADEO = `
(function(){try{
  if(localStorage.getItem("${CLAVE_TEMA}")==="oscuro")
    document.documentElement.classList.add("dark");
}catch(e){}})();
`;
