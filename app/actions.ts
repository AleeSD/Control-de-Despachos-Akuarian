"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS } from "@/lib/estados";

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

export async function actualizarEstado(clavePedido: string, estado: string) {
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
    return { ok: false, error: "Estado inválido." };
  }
  if (!(await esAlmacen())) {
    return { ok: false, error: "Sin permisos para editar." };
  }

  const supabase = createClient();
  // La RLS también lo exige; este UPDATE solo pasa si el rol es 'almacen'.
  const { error } = await supabase
    .from("pedidos")
    .update({ estado, actualizado_en: new Date().toISOString() })
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
