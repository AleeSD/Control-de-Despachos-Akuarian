# Control de Despachos — Akuarian

Aplicación web interna para el control diario de despachos de almacén. Reemplaza el prototipo Streamlit original conservando exactamente la lógica de negocio (ETL de Excel y generación de reporte DESPACHO PENDIENTES).

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.18 |
| UI | React | 18.3.x |
| Lenguaje | TypeScript | 5.6.x |
| Estilos | Tailwind CSS (tokens Material 3) | 3.4.x |
| BaaS | Supabase (Postgres + Auth + Storage) | JS SDK 2.45.x |
| Lectura Excel | SheetJS (`xlsx`) | 0.18.5 |
| Escritura Excel | ExcelJS | 4.4.0 |
| Gráficos | Recharts | 2.13.x |
| Testing | Vitest | 2.1.x |
| Hosting | Vercel | — |

---

## Roles y permisos

| Rol | Puede hacer |
|---|---|
| `almacen` | Ver todo, editar estado y destino, subir Excel, generar reporte |
| `jefe` | Solo lectura (KPIs, gráfico, tabla) |

El rol por defecto al crear un usuario es `jefe`. Para elevar a `almacen` se ejecuta un UPDATE directo en Supabase (ver sección Setup).

---

## Requisitos previos

- Node.js 20+ y npm
- Cuenta Supabase con proyecto activo
- Cuenta Vercel (para el despliegue)

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/AleeSD/Control-de-Despachos-Akuarian.git
cd Control-de-Despachos-Akuarian
npm install
```

### 2. Variables de entorno

Crea `.env.local` en la raíz con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Las claves están en **Supabase → Project Settings → API**.

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (pública) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anon/publishable (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — solo en servidor, nunca en cliente |

### 3. Aplicar migraciones SQL

En **Supabase Dashboard → SQL Editor**, ejecuta en orden:

1. `supabase/migrations/0001_init.sql` — tablas, RLS, trigger, función `es_almacen()`
2. `supabase/migrations/0002_storage.sql` — bucket privado `programaciones`

### 4. Crear usuarios y asignar roles

En **Supabase → Authentication → Users → Add user** (marca *Auto Confirm User*).

El trigger `on_auth_user_created` crea el perfil automáticamente con `rol = 'jefe'`.

Para dar rol `almacen`:

```sql
update public.profiles
set rol = 'almacen', nombre = 'Nombre Apellido'
where id = (select id from auth.users where email = 'almacen@empresa.com');
```

### 5. Correr en local

```bash
npm run dev
# → http://localhost:3000
```

---

## Scripts disponibles

```bash
npm run dev      # servidor de desarrollo (Next.js)
npm run build    # compilación de producción
npm run start    # servidor de producción local
npm run lint     # ESLint
npm run test     # tests con Vitest (run mode, sin watch)
```

---

## Despliegue en Vercel

1. Sube el repo a GitHub y conéctalo en [vercel.com](https://vercel.com) → **New Project → Import**.
2. Agrega las 3 variables de entorno en **Vercel → Settings → Environment Variables**.
3. Haz clic en **Deploy**.

El build usa el preset de Next.js por defecto. `exceljs` y `xlsx` están configurados como `serverComponentsExternalPackages` en `next.config.mjs` para evitar que el bundler del cliente los procese (usan Node built-ins).

---

## Uso diario

### Flujo típico (rol almacen)

1. **Iniciar sesión** con tu usuario.
2. **Subir Excel de Programación** — arrastra el `.xlsx` al área de carga o haz clic.
   - La app consolida por `Referencia del pedido + GUIA REMISION`.
   - Suma `bultos` y `cantidad` por pedido.
   - Conserva el estado y destino manual que ya hayas ingresado.
3. **Filtrar** por fecha (selector en el sidebar), estado o búsqueda libre.
4. **Editar estado** — desplegable en la columna Estado de cada fila (se guarda al instante).
5. **Editar destino** — pasa el cursor sobre la celda de destino y haz clic en el lápiz.
6. **Generar reporte** — botón "Generar reporte para envíos" descarga `DESPACHO_PENDIENTES_YYYY-MM-DD.xlsx`.

### Vista jefe (solo lectura)

Ve KPIs, gráfico de barras por estado y la tabla completa. No puede editar ni subir archivos.

---

## Lógica de importación (ETL)

- Hoja **`Programación`** (si no existe, usa la primera hoja).
- Cabeceras en **fila 1**, detectadas por nombre (insensible a mayúsculas y acentos).
- **Una fila por línea de producto**; un pedido puede aparecer repetido.
- **Clave de pedido** = `n_pedido + "|" + n_guia`.
- Texto → primer valor no vacío del grupo; `bultos` y `cantidad` → **suma**.
- Hay **dos columnas** `Fecha de Entrega`: la 1ª = fecha programada, la 2ª = entrega real.
- Valores `CONFIRMAR` / `ANULADO` / `POR CONFIRMAR` / vacío → `null` (no entran al filtro diario).
- `DESTINO` viene de la columna `Descripcion` (fallback: `Descripción` → `Destino`).
- El upsert **nunca pisa** `estado` ni `destino_manual`. El historial nunca se borra.
- Corte automático al encontrar 50 filas vacías consecutivas.

### Columnas reconocidas del Excel

| Campo interno | Nombres aceptados en el Excel |
|---|---|
| `n_pedido` | `Referencia del pedido` |
| `n_guia` | `GUIA REMISION`, `GUÍA REMISIÓN`, `Guia Remision` |
| `cliente` | `Cliente` |
| `destino` | `Descripcion`, `Descripción`, `Destino` |
| `distrito` | `Distrito` |
| `hora_cita` | `Hora Citas Agendadas` |
| `bultos` | `Bultos` |
| `observaciones` | `Observaciones` |
| `orden_compra` | `Orden de Compra` |
| `vendedor` | `Vendedor` |
| `ruc` | `RUC` |
| `telefono` | `Telefono`, `Teléfono` |
| `tipo_entrega` | `Tipo de Entrega` |
| `canal_comercial` | `Canal Comercial` |
| `cantidad` | `Cantidad` |
| `codigo` | `Codigo`, `Código` |
| `nombre` | `Nombre` |
| `fecha_programada` | Primera columna `Fecha de Entrega` |
| `fecha_entrega` | Segunda columna `Fecha de Entrega` |

---

## Lógica del reporte

- Parte de la plantilla **DESPACHO PENDIENTES** (embebida en `lib/plantilla-base64.ts` como base64).
- Cabeceras en **fila 3**, datos desde **fila 4**, columnas **B–L**.
- `DESTINO` = `destino_manual ?? destino` (respeta ediciones manuales).
- Fechas escritas como valores reales con formato `dd/mm/yyyy`.
- Deshace celdas combinadas y autofiltro heredado de la plantilla para evitar filas fantasma.
- Descarga como `DESPACHO_PENDIENTES_YYYY-MM-DD.xlsx`.

### Columnas del reporte (B → L)

| Columna | Campo |
|---|---|
| B | N° Pedido |
| C | Cliente |
| D | N° Guía |
| E | Destino efectivo |
| F | Distrito |
| G | Fecha programada |
| H | Fecha entrega |
| I | Hora cita |
| J | Bultos |
| K | Observaciones |
| L | Estado |

---

## Estados de despacho

| Estado | Descripción |
|---|---|
| `pendiente` | Estado inicial por defecto |
| `en ruta` | Salió a entregar |
| `entregado` | Entrega confirmada |
| `no salió a ruta` | No partió ese día |
| `cliente no estaba` | Intento fallido |
| `reprogramado` | Se cambió la fecha |
| `cancelado` | Anulado definitivamente |
| `otro` | Cualquier otro caso |

---

## Estructura del proyecto

```
/
├── app/
│   ├── page.tsx                  # Server Component: auth + datos → Dashboard
│   ├── actions.ts                # Server Actions: actualizarEstado / actualizarDestino
│   ├── layout.tsx                # Layout raíz (fuente Inter, Material Symbols)
│   ├── globals.css               # Reset + variables CSS base
│   ├── login/
│   │   ├── page.tsx              # Pantalla de login (Supabase Auth UI-less)
│   │   └── actions.ts            # Server Action: signInWithPassword
│   ├── auth/
│   │   └── signout/route.ts      # POST: cerrar sesión
│   └── api/
│       ├── import/route.ts       # POST: sube y consolida el Excel (ETL)
│       └── export/route.ts       # GET: genera y descarga el reporte .xlsx
│
├── components/
│   ├── Dashboard.tsx             # Orquestador cliente: filtros, layout
│   ├── Header.tsx                # Cabecera con nombre de fecha y menú usuario
│   ├── Sidebar.tsx               # Filtros: fecha, estados, búsqueda libre
│   ├── KpiCards.tsx              # 5 tarjetas KPI con porcentajes
│   ├── EstadoChart.tsx           # Gráfico de barras Recharts por estado
│   ├── PedidosTable.tsx          # Tabla principal con edición inline
│   ├── EstadoPill.tsx            # Pill de color según estado (solo lectura)
│   ├── UploadCard.tsx            # Drag & drop para subir Excel
│   └── ReporteSection.tsx        # Botón de generación del reporte
│
├── lib/
│   ├── types.ts                  # Tipos TypeScript (Pedido, PedidoVista, Profile…)
│   ├── estados.ts                # ESTADOS[], colores, colorDeEstado()
│   ├── etl.ts                    # leerProgramacion(): lee y consolida el Excel
│   ├── export.ts                 # generarReporte(): genera el .xlsx de salida
│   ├── data.ts                   # getPerfil(), getPedidos(), getFechasDisponibles()…
│   ├── vista.ts                  # aVista(): Pedido → PedidoVista (agrega destino_efectivo)
│   ├── format.ts                 # fechaCorta(), fechaLarga(), proximaFecha(), iniciales()
│   ├── plantilla-base64.ts       # Plantilla DESPACHO PENDIENTES embebida en base64
│   └── supabase/
│       ├── client.ts             # createBrowserClient (componentes cliente)
│       ├── server.ts             # createServerClient con cookies (RSC / Route Handlers)
│       └── admin.ts              # createAdminClient con service_role (import/export)
│
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql         # Tablas, RLS, trigger on_auth_user_created, es_almacen()
│       └── 0002_storage.sql      # Bucket privado 'programaciones'
│
├── tests/
│   ├── data.test.ts              # Tests de data.ts
│   ├── etl.test.ts               # Tests del ETL (parseo y consolidación)
│   ├── export.test.ts            # Tests del generador de reporte
│   └── format.test.ts            # Tests de utilidades de formato
│
├── Doc tests/                    # Archivos Excel de muestra para pruebas
│   ├── DESPACHO PENDIENTES 1.xlsx
│   └── Programacion despachos Akuarian 2026.xlsx
│
├── middleware.ts                 # Auth gate: sin sesión → /login
├── next.config.mjs               # exceljs/xlsx como serverComponentsExternalPackages
├── tailwind.config.ts            # Tokens Material 3 / paleta celeste Akuarian
├── tsconfig.json                 # TypeScript strict, paths @/*
├── postcss.config.mjs            # Autoprefixer
├── vitest.config.ts              # Configuración de tests
└── package.json
```

---

## Seguridad

- **RLS activo** en todas las tablas: `pedidos`, `profiles`, `importaciones`.
- `es_almacen()` es `SECURITY DEFINER` para leer `profiles` sin exponer otras filas.
- El middleware de Next.js bloquea todas las rutas si no hay sesión válida.
- Las API routes validan rol en servidor antes de ejecutar cualquier acción.
- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en Route Handlers (nunca llega al cliente).
- El bucket `programaciones` es privado (no accesible por URL pública).

---

## Tests

```bash
npm run test
```

Los tests están en `tests/` y cubren el ETL, el generador de reporte, la capa de datos y las utilidades de formato. Usan Vitest en modo `run` (sin watch).
