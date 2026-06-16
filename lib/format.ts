// Utilidades de formato compartidas por la UI.

// 'YYYY-MM-DD' -> 'dd/mm/aaaa' (sin crear Date, evita líos de zona horaria).
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// 'YYYY-MM-DD' -> 'dd de <mes> de aaaa' para encabezados.
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  return `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}`;
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function iniciales(nombre: string | null | undefined, email?: string): string {
  const base = (nombre && nombre.trim()) || email || "?";
  const partes = base.trim().split(/\s+/).slice(0, 2);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
