export type Rol = "almacen" | "jefe";

export interface Profile {
  id: string;
  nombre: string | null;
  rol: Rol;
}

export interface ProductoLinea {
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface Pedido {
  clave_pedido: string;
  n_pedido: string;
  n_guia: string | null;
  cliente: string | null;
  destino: string | null;
  destino_manual: string | null;
  distrito: string | null;
  fecha_programada: string | null; // ISO 'YYYY-MM-DD'
  fecha_entrega: string | null;
  hora_cita: string | null;
  bultos: number;
  observaciones: string | null;
  orden_compra: string | null;
  cantidad_total: number;
  vendedor: string | null;
  ruc: string | null;
  telefono: string | null;
  tipo_entrega: string | null;
  canal_comercial: string | null;
  productos: ProductoLinea[];
  estado: string;
  nota_estado: string | null;
  fecha_reprogramada: string | null;
  actualizado_en: string;
  creado_en: string;
}

// `destino_efectivo` = destino_manual || destino (igual que el COALESCE del prototipo).
export interface PedidoVista extends Pedido {
  destino_efectivo: string;
}

// Pedido consolidado tal como sale del ETL (antes de tocar la BD).
export interface PedidoConsolidado {
  clave_pedido: string;
  n_pedido: string;
  n_guia: string;
  cliente: string;
  destino: string;
  distrito: string;
  fecha_programada: string | null; // ISO o null
  fecha_entrega: string | null;
  hora_cita: string;
  observaciones: string;
  bultos: number;
  orden_compra: string;
  cantidad_total: number;
  vendedor: string;
  ruc: string;
  telefono: string;
  tipo_entrega: string;
  canal_comercial: string;
  productos: ProductoLinea[];
  tiene_fecha: boolean;
}
