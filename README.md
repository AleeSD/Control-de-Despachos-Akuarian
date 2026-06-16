# Control de Despachos

Aplicación web para el control diario de despachos de almacén. Reemplaza el
prototipo Streamlit conservando **exactamente** la lógica de negocio.

## Stack
- **Next.js 14 (App Router) + React + TypeScript**
- **Tailwind CSS** (tokens Material 3, paleta celeste de Stitch)
- **Supabase** — Postgres, Auth, Storage
- **SheetJS (`xlsx`)** para leer el Excel de Programación
- **ExcelJS** para generar el reporte DESPACHO PENDIENTES
- **Recharts** para el gráfico de estados
- **Vercel** hosting

## Roles

| Rol       | Permisos |
|-----------|----------|
| `almacen` | Ve todo, **edita** estado y destino, sube Excel, genera reporte |
| `jefe`    | **Solo lectura** (KPIs, gráfico, tabla) |

---

## Requisitos

- Node.js 20+ y npm
- Cuenta Supabase (proyecto activo)
- Cuenta Vercel

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/control-despachos-akuarian.git
cd control-despachos-akuarian
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Las claves están en **Supabase → Project Settings → API**.

### 3. Aplicar migraciones SQL

En **Supabase Dashboard → SQL Editor**, ejecuta en orden:

1. Contenido de `supabase/migrations/0001_init.sql`
2. Contenido de `supabase/migrations/0002_storage.sql`

Esto crea:
- Tabla `pedidos` con RLS (auth puede leer; solo `almacen` escribe)
- Tabla `profiles` con trigger que crea perfil al registrar usuario
- Tabla `importaciones`
- Función `es_almacen()`
- Bucket privado `programaciones` en Storage

### 4. Crear usuarios y asignar roles

En **Supabase → Authentication → Users → Add user**:
- Marca *Auto Confirm User*
- Crea un usuario para rol `almacen` y otro para `jefe`

El trigger asigna `rol = 'jefe'` por defecto. Para dar rol `almacen`:

```sql
update public.profiles
set rol = 'almacen', nombre = 'Nombre Apellido'
where id = (select id from auth.users where email = 'almacen@tuempresa.com');
```

### 5. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000 — te pedirá iniciar sesión.

---

## Despliegue en Vercel

1. Sube el código a GitHub:

```bash
git remote add origin https://github.com/TU_USUARIO/control-despachos-akuarian.git
git push -u origin main
```

2. En [vercel.com](https://vercel.com): **New Project → Import from GitHub → selecciona el repo**

3. En **Vercel → Settings → Environment Variables**, agrega las 3 variables:

| Variable | Tipo |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain text |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Plain text |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (solo servidor) |

4. Haz clic en **Deploy**. La URL de producción será `https://control-despachos-akuarian.vercel.app` (o similar).

---

## Uso diario

1. **Iniciar sesión** con tu usuario (almacén o jefe).
2. **Subir Excel de Programación** — arrastra el `.xlsx` al área de carga o haz clic en ella.
   - La app consolida por `Referencia del pedido + GUIA REMISION`.
   - Suma bultos y cantidades por pedido.
   - **Conserva** el estado y destino manual que ya hayas ingresado.
3. **Filtrar** por fecha (selector de fecha en el sidebar), estado o búsqueda libre.
4. **Editar estado** — haz clic en la pill de estado de cualquier fila (el cambio se guarda al instante).
5. **Editar destino** — pasa el cursor sobre la celda de destino y haz clic en el ícono de lápiz.
6. **Generar reporte** — botón "Generar reporte para envíos" descarga el `.xlsx` con formato DESPACHO PENDIENTES.

---

## Lógica de importación (resumen)

- Hoja **`Programación`**, cabeceras en **fila 1**, por **nombre de cabecera**.
- **Una fila por línea de producto**; consolida por `n_pedido|n_guia`.
- Texto = primer valor no vacío del grupo; `bultos` y `cantidad` se **suman**.
- Dos columnas `Fecha de Entrega`: la 1ª = fecha programada, la 2ª = entrega real.
- `CONFIRMAR`/`ANULADO`/vacío → sin fecha (no entra al filtro diario).
- `DESTINO` viene de la columna **`Descripcion`** (fallback: `Destino`).
- El upsert **nunca pisa** `estado` ni `destino_manual`. Nunca borra histórico.

## Lógica del reporte

- Usa la plantilla **DESPACHO PENDIENTES** (embebida en `lib/plantilla-base64.ts`).
- Cabeceras en **fila 3**, datos desde **fila 4**, columnas **B–L**.
- `DESTINO` = `destino_manual ?? destino` (respeta ediciones manuales).
- Fechas como valores reales con formato `dd/mm/yyyy`.
- Descarga como `DESPACHO_PENDIENTES_YYYY-MM-DD.xlsx`.

---

## Estructura del proyecto

```
app/
  page.tsx                  Dashboard (Server Component): auth, rol, datos
  login/                    Pantalla de login (Supabase Auth)
  actions.ts                Server actions: editar estado / destino
  api/import/route.ts       POST: sube y consolida el Excel
  api/export/route.ts       GET: genera y descarga el reporte .xlsx
  auth/signout/route.ts     POST: cerrar sesión
components/
  Dashboard.tsx             Orquestador cliente del dashboard
  Sidebar.tsx               Filtros (fecha, estado, búsqueda)
  Header.tsx                Cabecera con refrescar y menú usuario
  KpiCards.tsx              5 tarjetas KPI con porcentajes reales
  EstadoChart.tsx           Gráfico de barras Recharts por estado
  PedidosTable.tsx          Tabla con edición inline y detalle de productos
  UploadCard.tsx            Drag&drop para subir el Excel
  ReporteSection.tsx        Botón de generación del reporte
  EstadoPill.tsx            Pill de color por estado
lib/
  etl.ts                    Consolidación del Excel (port de etl.py)
  export.ts                 Generación del reporte (port de export.py)
  estados.ts                Lista y colores de estados
  types.ts                  Tipos TypeScript
  data.ts                   Capa de acceso a datos (servidor)
  format.ts                 Utilidades de formato de fechas
  plantilla-base64.ts       Plantilla DESPACHO PENDIENTES en base64
  supabase/
    client.ts               Cliente Supabase para el navegador
    server.ts               Cliente Supabase para el servidor
    admin.ts                Cliente service_role para import/export
supabase/migrations/
  0001_init.sql             Tablas, RLS, trigger, función es_almacen()
  0002_storage.sql          Bucket privado 'programaciones'
middleware.ts               Auth gate: sin sesión → /login
```
