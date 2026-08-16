import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SCRIPT_SIN_PARPADEO } from "@/components/tema";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEFLAB",
  description: "ERP y CRM para laboratorios dentales",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-PE"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema guardado ANTES de que el navegador pinte. Sin
            esto, quien tenga el tema oscuro ve un fogonazo blanco en cada
            carga. Va inline a propósito: cualquier otra vía llega tarde. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SIN_PARPADEO }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
