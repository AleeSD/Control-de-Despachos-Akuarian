"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PedidoVista } from "@/lib/types";
import { ESTADOS, colorDeEstado } from "@/lib/estados";

export default function EstadoChart({ pedidos }: { pedidos: PedidoVista[] }) {
  const conteo = new Map<string, number>();
  for (const p of pedidos) conteo.set(p.estado, (conteo.get(p.estado) ?? 0) + 1);

  // Solo estados con al menos un pedido, en el orden canónico.
  const data: Array<{ estado: string; cantidad: number; color: string }> = ESTADOS.filter((e) => (conteo.get(e) ?? 0) > 0).map((e) => ({
    estado: e,
    cantidad: conteo.get(e) ?? 0,
    color: colorDeEstado(e).bar,
  }));
  // Estados fuera de la lista canónica (por si acaso).
  for (const [e, c] of conteo) {
    if (!ESTADOS.includes(e as (typeof ESTADOS)[number])) {
      data.push({ estado: e, cantidad: c, color: colorDeEstado(e).bar });
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-soft p-lg border border-surface-variant col-span-1 flex flex-col">
      <h3 className="text-title-lg font-semibold text-on-surface mb-lg">Pedidos por estado</h3>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-body-md h-48">
          Sin datos para esta fecha
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="estado"
                tick={{ fontSize: 11, fill: "#40484e" }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: "#d8e3f5" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#40484e" }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "#eef4ff" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #d8e3f5",
                  fontSize: 12,
                  boxShadow: "0px 4px 20px rgba(31,42,55,0.08)",
                }}
                labelClassName="capitalize"
                formatter={(v: number) => [v, "Pedidos"]}
              />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {data.map((d) => (
                  <Cell key={d.estado} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
