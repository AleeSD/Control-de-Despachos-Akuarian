import type { PedidoVista } from "@/lib/types";

interface Props {
  pedidos: PedidoVista[];
}

function pct(parte: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((parte / total) * 100)}%`;
}

export default function KpiCards({ pedidos }: Props) {
  const total = pedidos.length;
  const pendientes = pedidos.filter((p) => p.estado === "pendiente").length;
  const enRuta = pedidos.filter((p) => p.estado === "en ruta").length;
  const entregados = pedidos.filter((p) => p.estado === "entregado").length;
  const bultos = pedidos.reduce((s, p) => s + (p.bultos || 0), 0);

  const cards = [
    { label: "Total pedidos", valor: total, color: "text-primary-container", badge: null, border: "hover:border-primary-container" },
    { label: "Pendientes", valor: pendientes, color: "text-tertiary-container", badge: pct(pendientes, total), border: "hover:border-tertiary-container" },
    { label: "En ruta", valor: enRuta, color: "text-primary-container", badge: pct(enRuta, total), border: "hover:border-primary-container" },
    { label: "Entregados", valor: entregados, color: "text-secondary-container", badge: pct(entregados, total), border: "hover:border-secondary-container" },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-md">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-surface-container-lowest rounded-kpi p-md shadow-soft border border-surface-variant transition-colors ${c.border}`}
        >
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
            {c.label}
          </p>
          <div className="flex items-end justify-between">
            <h3 className={`text-display-lg font-semibold ${c.color}`}>{c.valor}</h3>
            {c.badge && (
              <div className="bg-surface-variant px-2 py-1 rounded text-on-surface-variant text-xs font-medium">
                {c.badge}
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="bg-surface-container-lowest rounded-kpi p-md shadow-soft border border-surface-variant hover:border-outline transition-colors">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
          Bultos totales
        </p>
        <div className="flex items-end justify-between">
          <h3 className="text-display-lg font-semibold text-on-surface">{bultos}</h3>
          <span className="material-symbols-outlined text-outline">inventory_2</span>
        </div>
      </div>
    </section>
  );
}
