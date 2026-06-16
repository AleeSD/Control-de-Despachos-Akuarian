"use client";

import { Fragment, useState, useTransition } from "react";
import type { PedidoVista } from "@/lib/types";
import { ESTADOS, colorDeEstado } from "@/lib/estados";
import { fechaCorta } from "@/lib/format";
import { actualizarEstado, actualizarDestino } from "@/app/actions";
import EstadoPill from "./EstadoPill";

interface Props {
  pedidos: PedidoVista[];
  editable: boolean;
}

export default function PedidosTable({ pedidos, editable }: Props) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [editandoDestino, setEditandoDestino] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Overrides optimistas hasta que el refresh del servidor confirme.
  const [estadoOv, setEstadoOv] = useState<Record<string, string>>({});
  const [destinoOv, setDestinoOv] = useState<Record<string, string>>({});

  function cambiarEstado(clave: string, estado: string) {
    setEstadoOv((o) => ({ ...o, [clave]: estado }));
    // startTransition necesita una función síncrona en React 18;
    // la acción async se dispara sin bloquear la UI.
    startTransition(() => {
      void actualizarEstado(clave, estado);
    });
  }

  function guardarDestino(clave: string, valor: string) {
    setEditandoDestino(null);
    setDestinoOv((o) => ({ ...o, [clave]: valor }));
    startTransition(() => {
      void actualizarDestino(clave, valor);
    });
  }

  // isPending usado para mostrar opacidad mientras se guarda.
  const rowClass = isPending ? "opacity-80" : "";

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-soft border border-surface-variant col-span-1 xl:col-span-2 overflow-hidden flex flex-col">
      <div className="p-md border-b border-surface-variant flex justify-between items-center bg-background">
        <h3 className="text-title-lg font-semibold text-on-surface">Listado de Pedidos</h3>
        <span className="text-label-sm text-on-surface-variant">{pedidos.length} pedidos</span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className={`w-full text-left whitespace-nowrap ${rowClass}`}>
          <thead className="bg-background sticky top-0 border-b border-surface-variant z-10">
            <tr>
              {[
                "", "N° Pedido", "Cliente", "N° Guía", "Destino", "Distrito",
                "F. Programada", "Hora cita", "Bultos", "Observaciones", "Estado",
              ].map((h, i) => (
                <th
                  key={i}
                  className={`px-md py-sm text-label-sm text-on-surface-variant uppercase tracking-wider ${
                    h === "Bultos" ? "text-center" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant text-body-md text-on-surface">
            {pedidos.length === 0 && (
              <tr>
                <td colSpan={11} className="px-md py-xl text-center text-on-surface-variant">
                  No hay pedidos que coincidan con los filtros.
                </td>
              </tr>
            )}
            {pedidos.map((p) => {
              const estado = estadoOv[p.clave_pedido] ?? p.estado;
              const destino = destinoOv[p.clave_pedido] ?? p.destino_efectivo;
              const abierta = expandida === p.clave_pedido;
              return (
                <Fragment key={p.clave_pedido}>
                  <tr className="hover:bg-surface-bright transition-colors group">
                    <td className="px-md py-sm">
                      <button
                        onClick={() => setExpandida(abierta ? null : p.clave_pedido)}
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Ver productos"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {abierta ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </td>
                    <td className="px-md py-sm font-medium">{p.n_pedido}</td>
                    <td className="px-md py-sm max-w-[200px] truncate" title={p.cliente ?? ""}>
                      {p.cliente || "—"}
                    </td>
                    <td className="px-md py-sm">{p.n_guia || "—"}</td>
                    <td className="px-md py-sm max-w-[220px]">
                      {editable && editandoDestino === p.clave_pedido ? (
                        <input
                          autoFocus
                          defaultValue={destino}
                          onBlur={(e) => guardarDestino(p.clave_pedido, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") guardarDestino(p.clave_pedido, e.currentTarget.value);
                            if (e.key === "Escape") setEditandoDestino(null);
                          }}
                          className="w-full px-2 py-1 border border-primary-container rounded-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary-container"
                        />
                      ) : (
                        <div className="flex items-center gap-1 group/dest">
                          <span className="truncate" title={destino}>
                            {destino || "—"}
                          </span>
                          {editable && (
                            <button
                              onClick={() => setEditandoDestino(p.clave_pedido)}
                              className="opacity-0 group-hover/dest:opacity-100 text-on-surface-variant hover:text-primary transition-opacity"
                              title="Editar destino"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-md py-sm">{p.distrito || "—"}</td>
                    <td className="px-md py-sm">{fechaCorta(p.fecha_programada)}</td>
                    <td className="px-md py-sm">{p.hora_cita || "—"}</td>
                    <td className="px-md py-sm text-center">
                      <span className="inline-block px-2 py-1 bg-surface-variant rounded text-xs">
                        {p.bultos}
                      </span>
                    </td>
                    <td className="px-md py-sm max-w-[200px] truncate" title={p.observaciones ?? ""}>
                      {p.observaciones || "—"}
                    </td>
                    <td className="px-md py-sm">
                      {editable ? (
                        <select
                          value={estado}
                          onChange={(e) => cambiarEstado(p.clave_pedido, e.target.value)}
                          className="text-xs font-medium rounded-full border px-2.5 py-1 capitalize focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
                          style={{
                            backgroundColor: colorDeEstado(estado).bg,
                            color: colorDeEstado(estado).text,
                            borderColor: colorDeEstado(estado).border,
                          }}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e} className="bg-white text-on-surface">
                              {e}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <EstadoPill estado={estado} />
                      )}
                    </td>
                  </tr>

                  {abierta && (
                    <tr className="bg-surface-container-low">
                      <td colSpan={11} className="px-md py-md">
                        <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-md">
                          <div className="flex flex-wrap gap-x-xl gap-y-1 mb-md text-body-md">
                            <span><b>RUC:</b> {p.ruc || "—"}</span>
                            <span><b>Teléfono:</b> {p.telefono || "—"}</span>
                            <span><b>Vendedor:</b> {p.vendedor || "—"}</span>
                            <span><b>O. Compra:</b> {p.orden_compra || "—"}</span>
                            <span><b>Tipo entrega:</b> {p.tipo_entrega || "—"}</span>
                            <span><b>Canal:</b> {p.canal_comercial || "—"}</span>
                            <span><b>Cantidad total:</b> {p.cantidad_total}</span>
                          </div>
                          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                            Productos ({p.productos.length})
                          </p>
                          {p.productos.length === 0 ? (
                            <p className="text-body-md text-on-surface-variant">Sin detalle de productos.</p>
                          ) : (
                            <table className="w-full text-left text-body-md">
                              <thead>
                                <tr className="text-label-sm text-on-surface-variant uppercase">
                                  <th className="py-1 pr-md">Código</th>
                                  <th className="py-1 pr-md">Nombre</th>
                                  <th className="py-1 text-right">Cantidad</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-variant">
                                {p.productos.map((prod, i) => (
                                  <tr key={i}>
                                    <td className="py-1 pr-md font-medium">{prod.codigo || "—"}</td>
                                    <td className="py-1 pr-md">{prod.nombre || "—"}</td>
                                    <td className="py-1 text-right">{prod.cantidad}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
