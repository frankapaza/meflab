import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Inventario · MEFLAB" };

export default function InventarioPage() {
  return (
    <PantallaFutura
      modulo="3.4"
      titulo="Inventario"
      fase={3}
      semana="fase 3"
      traera={[
        "Materiales con lote, vencimiento y ubicación.",
        "Consumo por trabajo, que es lo que permite saber cuánto cuesta de verdad una corona.",
        "Umbrales de stock bajo y crítico con aviso.",
        "Inventario físico con ajuste aprobado y trazabilidad de quién lo hizo.",
      ]}
    />
  );
}
