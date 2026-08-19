import { PantallaFutura } from "@/components/pantalla-futura";

export const metadata = { title: "Facturación · MEFLAB" };

export default function FacturacionPage() {
  return (
    <PantallaFutura
      modulo="2.1"
      titulo="Facturación"
      fase={2}
      semana="semana 16"
      traera={[
        "Factura y boleta con series y correlativos sin salto, IGV calculado por línea sobre el valor de venta que ya guarda MEFLAB.",
        "Emisión desde una orden o desde varias a la vez.",
        "Notas de crédito y débito, anulación y PDF.",
        "La cuenta por cobrar nace aquí, del documento — nunca del trabajo (D-02).",
      ]}
      mientras={{
        texto: "Los precios y las listas ya se configuran en",
        href: "/configuracion",
        enlace: "Catálogo y tarifas",
      }}
    />
  );
}
