// Estados de despacho — definidos en UN SOLO lugar (igual que config.py del prototipo).
// Cambiar aquí basta para añadir/renombrar estados y sus colores.

export const ESTADOS = [
  "pendiente",
  "preparado",
  "última milla",
  "en ruta",
  "entregado",
  "no salió a ruta",
  "cliente no estaba",
  "reprogramado",
  "cancelado",
  "otro",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const ESTADO_DEFAULT: Estado = "pendiente";

// Paleta por estado (tomada del diseño de Stitch). `bar` = color de barra del gráfico.
export interface EstadoColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
  bar: string;
}

export const ESTADO_COLORS: Record<string, EstadoColor> = {
  pendiente:       { bg: "#F3E8FF", text: "#573F7C", border: "#CBAFF5", dot: "#573F7C", bar: "#CBAFF5" },
  preparado:       { bg: "#FEE8D3", text: "#7B3200", border: "#F4924A", dot: "#7B3200", bar: "#F4924A" },
  "última milla":  { bg: "#D8F5F0", text: "#005548", border: "#47C4B4", dot: "#005548", bar: "#47C4B4" },
  "en ruta":       { bg: "#E6F4FE", text: "#005172", border: "#7CC4F2", dot: "#005172", bar: "#7CC4F2" },
  entregado: { bg: "#E8F8F0", text: "#0A7147", border: "#99F2BD", dot: "#0A7147", bar: "#99F2BD" },
  "no salió a ruta": { bg: "#FFDAD6", text: "#93000A", border: "#BA1A1A", dot: "#BA1A1A", bar: "#FFB4AB" },
  "cliente no estaba": { bg: "#FFF3D6", text: "#7A5900", border: "#E8C765", dot: "#7A5900", bar: "#E8C765" },
  reprogramado: { bg: "#E4EFFF", text: "#004C6C", border: "#87CFFD", dot: "#004C6C", bar: "#87CFFD" },
  cancelado: { bg: "#FFDAD6", text: "#93000A", border: "#BA1A1A", dot: "#BA1A1A", bar: "#BA1A1A" },
  otro: { bg: "#E4EFFF", text: "#40484E", border: "#BFC7CF", dot: "#40484E", bar: "#BFC7CF" },
};

export function colorDeEstado(estado: string): EstadoColor {
  return ESTADO_COLORS[estado] ?? ESTADO_COLORS.otro;
}

// Estados que abren un panel de motivo/fecha antes de confirmar el cambio.
export const ESTADOS_CON_NOTA = new Set<string>([
  "otro",
  "cancelado",
  "no salió a ruta",
  "cliente no estaba",
  "reprogramado",
]);
