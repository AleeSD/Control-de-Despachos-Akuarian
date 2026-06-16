// Conversión Pedido (fila de BD) -> PedidoVista para la UI y el reporte.
// `destino_efectivo` = destino_manual || destino (igual que el COALESCE del prototipo).
// `productos` puede llegar como array (jsonb) o como string JSON; lo normalizamos.

import type { Pedido, PedidoVista, ProductoLinea } from "./types";

export function aVista(p: Pedido): PedidoVista {
  const destino_efectivo =
    (p.destino_manual && p.destino_manual.trim()) || p.destino || "";

  let productos: unknown = p.productos;
  if (typeof productos === "string") {
    try {
      productos = JSON.parse(productos);
    } catch {
      productos = [];
    }
  }

  return {
    ...p,
    productos: (productos as ProductoLinea[]) ?? [],
    destino_efectivo,
  };
}
