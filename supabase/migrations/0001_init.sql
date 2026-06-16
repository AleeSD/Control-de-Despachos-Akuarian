-- ============================================================================
-- Control de Despachos — esquema inicial
-- Tablas: pedidos, profiles, importaciones
-- Seguridad: RLS. Lectura para autenticados; escritura solo rol 'almacen'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: liga auth.users con un rol ('almacen' | 'jefe').
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol    text not null default 'jefe' check (rol in ('almacen', 'jefe'))
);

-- ---------------------------------------------------------------------------
-- pedidos: histórico consolidado. estado y destino_manual NUNCA se pisan al importar.
-- ---------------------------------------------------------------------------
create table if not exists public.pedidos (
  clave_pedido     text primary key,              -- = n_pedido || '|' || n_guia
  n_pedido         text not null,
  n_guia           text,
  cliente          text,
  destino          text,                          -- viene de "Descripcion" (dirección)
  destino_manual   text,                          -- corrección manual; nunca se pisa
  distrito         text,
  fecha_programada date,                          -- 1ª "Fecha de Entrega" (programada)
  fecha_entrega    date,                          -- 2ª "Fecha de Entrega" (real)
  hora_cita        text,
  bultos           integer not null default 0,    -- suma de líneas
  observaciones    text,
  orden_compra     text,
  cantidad_total   numeric not null default 0,    -- suma de "Cantidad"
  vendedor         text,
  ruc              text,
  telefono         text,
  tipo_entrega     text,
  canal_comercial  text,
  productos        jsonb default '[]'::jsonb,     -- [{codigo, nombre, cantidad}]
  estado           text not null default 'pendiente',  -- nunca se pisa al importar
  actualizado_en   timestamptz not null default now(),
  creado_en        timestamptz not null default now()
);

create index if not exists idx_pedidos_fecha_programada on public.pedidos (fecha_programada);
create index if not exists idx_pedidos_estado on public.pedidos (estado);

-- ---------------------------------------------------------------------------
-- importaciones: bitácora de cada subida de Excel.
-- ---------------------------------------------------------------------------
create table if not exists public.importaciones (
  id                 bigint generated always as identity primary key,
  archivo            text,
  filas_consolidadas integer,
  importado_en       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: ¿el usuario actual tiene rol 'almacen'?
-- SECURITY DEFINER para leer profiles sin chocar con su propia RLS.
-- ---------------------------------------------------------------------------
create or replace function public.es_almacen()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'almacen'
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger: al crear un usuario en auth.users, crear su profile (rol 'jefe' por defecto).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'jefe')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.pedidos       enable row level security;
alter table public.importaciones enable row level security;

-- profiles: cada usuario lee su propio perfil.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

-- pedidos: cualquier autenticado lee; solo 'almacen' inserta/actualiza.
drop policy if exists pedidos_select_auth on public.pedidos;
create policy pedidos_select_auth on public.pedidos
  for select to authenticated using (true);

drop policy if exists pedidos_insert_almacen on public.pedidos;
create policy pedidos_insert_almacen on public.pedidos
  for insert to authenticated with check (public.es_almacen());

drop policy if exists pedidos_update_almacen on public.pedidos;
create policy pedidos_update_almacen on public.pedidos
  for update to authenticated using (public.es_almacen()) with check (public.es_almacen());

-- importaciones: autenticado lee; solo 'almacen' inserta.
drop policy if exists importaciones_select_auth on public.importaciones;
create policy importaciones_select_auth on public.importaciones
  for select to authenticated using (true);

drop policy if exists importaciones_insert_almacen on public.importaciones;
create policy importaciones_insert_almacen on public.importaciones
  for insert to authenticated with check (public.es_almacen());
