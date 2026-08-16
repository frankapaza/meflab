import type { NextConfig } from "next";

const enProduccion = process.env.NODE_ENV === "production";

/**
 * Cabeceras de seguridad (docs/02 §4.3).
 *
 * No hacen falta ni dominio ni cuenta: son configuración del propio
 * proyecto y se pueden dejar cerradas desde ya. Lo único que sí exige
 * cuenta es el certificado TLS, que Vercel provisiona solo.
 */
const CABECERAS = [
  // Nunca servir esto por HTTP. Sólo en producción: si el navegador
  // recuerda un HSTS de localhost, deja de poder abrir cualquier otro
  // proyecto local por HTTP y cuesta bastante quitárselo de encima.
  ...(enProduccion
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),

  // El navegador no adivina el tipo de contenido: se fía del Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Nadie mete la aplicación en un iframe. Evita el clickjacking sobre
  // acciones con efecto financiero (emitir, anular, cerrar caja).
  { key: "X-Frame-Options", value: "DENY" },

  // Al salir hacia otro sitio no se filtra la ruta completa, que puede
  // llevar el id de una orden o de un paciente.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // El laboratorio no usa cámara ni micrófono ni ubicación. Se apagan.
  // Cuando la pantalla del técnico tome fotos habrá que abrir `camera`
  // sólo para esa ruta.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // Aísla la ventana de posibles aperturas cruzadas.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Que la versión de Next no viaje en cada respuesta.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: CABECERAS }];
  },
};

export default nextConfig;

/*
 * PENDIENTE · Content-Security-Policy
 *
 * docs/02 §4.3 la deja para "tras estabilizar el front", y con razón: hoy
 * no se conocen todos los orígenes definitivos (Supabase, Sentry, fuentes,
 * el PSE de facturación). Ponerla ahora obligaría a reescribirla varias
 * veces y a convivir con fallos difíciles de leer.
 *
 * Tiene que estar ANTES de salir a producción, no después. El plan:
 *   1. Añadirla en `Content-Security-Policy-Report-Only` durante la Fase 2,
 *      cuando ya existan Supabase en la nube y Sentry.
 *   2. Leer los informes una semana con datos reales.
 *   3. Pasarla a modo bloqueante antes de la puesta en producción.
 *
 * Necesita nonce por petición para los scripts inline de Next, así que se
 * genera en proxy.ts y se propaga por cabecera.
 */
