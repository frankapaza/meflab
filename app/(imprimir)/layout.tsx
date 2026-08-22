/**
 * Layout de lo que se imprime.
 *
 * Sin barra lateral ni cabecera: un comprobante se entrega al cliente, y
 * lo que rodea a la aplicación no pinta en un papel. Vive fuera del grupo
 * `(app)` justamente para no heredarlo.
 */
export default function LayoutImprimir({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg text-ink">{children}</div>;
}
