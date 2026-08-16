"use client";

import { useState } from "react";

import { BarraLateral } from "@/components/layout/barra-lateral";
import { Cabecera } from "@/components/layout/cabecera";
import { useTema } from "@/components/tema";
import type { GrupoNav } from "@/lib/auth/navegacion";

/**
 * El armazón: cabecera arriba, barra lateral a la izquierda, contenido a
 * la derecha. La densidad se aplica AQUÍ y no en <html>, para que una
 * pantalla concreta pueda forzar la suya (la del técnico va en amplio).
 */
export function Shell({
  nav,
  laboratorio,
  usuario,
  roles,
  iniciales,
  ambito,
  children,
}: {
  nav: GrupoNav[];
  laboratorio: string;
  usuario: string;
  roles: string;
  iniciales: string;
  ambito: string;
  children: React.ReactNode;
}) {
  const { densidad } = useTema();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className={`dz-${densidad} flex h-screen flex-col overflow-hidden bg-bg text-ink`}>
      <Cabecera
        laboratorio={laboratorio}
        usuario={usuario}
        roles={roles}
        iniciales={iniciales}
        onAbrirMenu={() => setMenuAbierto(true)}
      />
      <div className="flex min-h-0 flex-1">
        <BarraLateral
          nav={nav}
          ambito={ambito}
          abierta={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
        />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
