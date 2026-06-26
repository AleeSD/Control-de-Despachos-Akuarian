"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, ESTADOS_CON_NOTA } from "@/lib/estados";

async function esAlmacen(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  return data?.rol === "almacen";
}

interface EstadoOpts {
  nota?: string | null;
  fechaReprogramada?: string | null;
}

export async function actualizarEstado(
  clavePedido: string,
  estado: string,
  opts?: EstadoOpts,
) {
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
    return { ok: false, error: "Estado inválido." };
  }
  if (!(await esAlmacen())) {
    return { ok: false, error: "Sin permisos para editar." };
  }

  // Validaciones de servidor (además de las del cliente).
  if (estado === "otro" && !opts?.nota?.trim()) {
    return { ok: false, error: "El estado 'otro' requiere un motivo." };
  }
  if (estado === "reprogramado" && !opts?.fechaReprogramada) {
    return { ok: false, error: "El estado 'reprogramado' requiere una nueva fecha." };
  }

  const payload: Record<string, unknown> = {
    estado,
    actualizado_en: new Date().toISOString(),
    // Para estados con nota: guarda el texto (o null si se dejó vacío).
    // Para estados limpios: limpia nota_estado.
    nota_estado: ESTADOS_CON_NOTA.has(estado) ? (opts?.nota?.trim() || null) : null,
  };

  // fecha_reprogramada solo se setea al reprogramar.
  // En estados "limpios" NO se toca, para que el pedido permanezca en su día nuevo.
  if (estado === "reprogramado" && opts?.fechaReprogramada) {
    payload.fecha_reprogramada = opts.fechaReprogramada;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("pedidos")
    .update(payload)
    .eq("clave_pedido", clavePedido);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function actualizarDestino(clavePedido: string, destinoManual: string) {
  if (!(await esAlmacen())) {
    return { ok: false, error: "Sin permisos para editar." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      destino_manual: destinoManual.trim() || null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("clave_pedido", clavePedido);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
