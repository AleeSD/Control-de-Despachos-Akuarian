import { createClient } from "@/lib/supabase/server";
import type { Pedido, PedidoVista, Profile } from "./types";

function aVista(p: Pedido): PedidoVista {
  const destino_efectivo =
    (p.destino_manual && p.destino_manual.trim()) || p.destino || "";
  // productos puede venir como string JSON o como array (jsonb).
  let productos = p.productos;
  if (typeof productos === "string") {
    try {
      productos = JSON.parse(productos);
    } catch {
      productos = [];
    }
  }
  return { ...p, productos: productos ?? [], destino_efectivo };
}

export async function getPerfil(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single();

  if (!data) {
    // Sin fila en profiles: tratamos como 'jefe' (solo lectura) por seguridad.
    return { id: user.id, nombre: user.email ?? null, rol: "jefe" };
  }
  return data as Profile;
}

export async function getFechasDisponibles(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("fecha_programada")
    .not("fecha_programada", "is", null)
    .order("fecha_programada", { ascending: true });

  const set = new Set<string>();
  (data ?? []).forEach((r: { fecha_programada: string | null }) => {
    if (r.fecha_programada) set.add(r.fecha_programada);
  });
  return Array.from(set).sort();
}

export function proximaFecha(fechas: string[], hoy = new Date()): string | null {
  if (fechas.length === 0) return null;
  const hoyIso = hoy.toISOString().slice(0, 10);
  const futuras = fechas.filter((f) => f >= hoyIso);
  return futuras.length > 0 ? futuras[0] : fechas[fechas.length - 1];
}

export async function getPedidos(fecha: string): Promise<PedidoVista[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pedidos")
    .select("*")
    .eq("fecha_programada", fecha)
    .order("n_pedido", { ascending: true });

  return (data ?? []).map((p) => aVista(p as Pedido));
}

export async function getUltimaImportacion(): Promise<{
  importado_en: string;
  filas_consolidadas: number | null;
} | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("importaciones")
    .select("importado_en, filas_consolidadas")
    .order("importado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
