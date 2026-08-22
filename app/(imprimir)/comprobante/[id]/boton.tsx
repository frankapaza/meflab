"use client";

/**
 * El botón que abre el diálogo de impresión del navegador. Desde ahí se
 * imprime o se guarda como PDF, que es lo que el laboratorio necesita
 * para adjuntarlo a un correo.
 */
export function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="h-tap rounded-r1 bg-acc px-s4 text-sm font-semibold text-acc-on shadow-e1 transition hover:brightness-110"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
