import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Compras · MEFLAB" };

export default function ComprasPage() {
  return (
    <PantallaFutura
      modulo="4.2"
      titulo="Compras y proveedores"
      fase={4}
      semana="fase 4"
      traera={[
        "Solicitud de compra y orden con sus estados.",
        "Recepción que actualiza el inventario, sin volver a teclear nada.",
        "Sugerencia de reposición a partir del consumo real.",
      ]}
    />
  );
}
