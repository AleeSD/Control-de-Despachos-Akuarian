import { colorDeEstado } from "@/lib/estados";

export default function EstadoPill({ estado }: { estado: string }) {
  const c = colorDeEstado(estado);
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap capitalize"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {estado}
    </span>
  );
}
