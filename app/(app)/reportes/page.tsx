import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Reportes · MEFLAB" };

export default function ReportesPage() {
  return (
    <PantallaFutura
      modulo="3.6"
      titulo="Reportes y KPIs"
      fase={3}
      semana="fase 3"
      traera={[
        "Los 9 indicadores del SRS, con su fórmula fija y una sola fuente cada uno.",
        "Reportes productivos, comerciales, financieros y de inventario.",
        "Costo estimado contra costo real por trabajo, doctor, servicio y periodo.",
        "Exportación a Excel y PDF.",
      ]}
      mientras={{
        texto: "Los indicadores del día y del mes ya están en",
        href: "/",
        enlace: "el dashboard",
      }}
    />
  );
}
