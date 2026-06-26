-- Motivo libre asociado al estado (excluido del upsert del import)
alter table public.pedidos add column nota_estado text;

-- Nueva fecha cuando un pedido se reprograma (excluida del upsert del import)
alter table public.pedidos add column fecha_reprogramada date;

-- Fecha efectiva del tablero: la reprogramada si existe, si no la programada.
-- Permite que un pedido reprogramado "se mueva" de día y sobreviva a re-imports.
alter table public.pedidos
  add column fecha_efectiva date
  generated always as (coalesce(fecha_reprogramada, fecha_programada)) stored;

create index if not exists idx_pedidos_fecha_efectiva
  on public.pedidos (fecha_efectiva);
