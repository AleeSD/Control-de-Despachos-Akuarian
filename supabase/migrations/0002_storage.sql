-- Bucket privado donde se guarda cada Excel de Programación subido.
-- La subida la hace el servidor con la service_role (salta RLS), así que el
-- bucket solo necesita existir. Lo dejamos privado por seguridad.
insert into storage.buckets (id, name, public)
values ('programaciones', 'programaciones', false)
on conflict (id) do nothing;
