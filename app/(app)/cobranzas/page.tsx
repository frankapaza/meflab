import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Cobranza · MEFLAB" };

export default function CobranzaPage() {
  return (
    <PantallaFutura
      modulo="2.5"
      titulo="Cobranza"
      fase={2}
      semana="semana 20"
      traera={[
        "Cartera priorizada por tramo de mora, leída de v_cartera — una sola fuente para toda la deuda.",
        "Guion de gestión distinto según cuánto lleve vencido, con el resultado de cada llamada.",
        "Promesas de pago con seguimiento automático de las que se incumplen.",
        "Agenda del día: a quién toca llamar hoy y por qué.",
      ]}
      mientras={{
        texto: "Puedes ver las condiciones comerciales de cada cliente en",
        href: "/clientes",
        enlace: "Clientes",
      }}
    />
  );
}
