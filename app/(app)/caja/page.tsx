import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Caja · MEFLAB" };

export default function CajaPage() {
  return (
    <PantallaFutura
      modulo="2.4"
      titulo="Caja"
      fase={2}
      semana="semana 20"
      traera={[
        "Apertura y cierre de caja con arqueo: teórico, físico y la diferencia.",
        "Movimientos por categoría, sólo efectivo — lo que entra por banco no pasa por caja.",
        "Registro de pagos con medio y referencia, aplicados al documento que corresponde.",
      ]}
    />
  );
}
