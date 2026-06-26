# TECHNICAL.md — Referencia técnica interna

Este documento describe la arquitectura, configuraciones, tipos y flujos de datos del proyecto. Está pensado como referencia antes de implementar nuevas funciones para evitar conflictos con el código existente.

---

## Versiones exactas

```
Node.js          ≥ 20
Next.js          14.2.18   (App Router, no Pages Router)
React            18.3.x
TypeScript       5.6.x     (strict: true)
Tailwind CSS     3.4.x
@supabase/ssr    0.5.2
@supabase/supabase-js  2.45.x
xlsx (SheetJS)   0.18.5
exceljs          4.4.0
recharts         2.13.x
vitest           2.1.x
```

---

## Configuración TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./*"] }
  }
}
```

- `strict: true` — todos los checks habilitados.
- Alias `@/` apunta a la raíz del proyecto.
- `moduleResolution: "bundler"` — requerido por Next.js 14.

---

## Configuración Next.js (`next.config.mjs`)

```js
experimental: {
  serverComponentsExternalPackages: ["exceljs", "xlsx"],
}
```

`exceljs` y `xlsx` usan Node built-ins (`fs`, `Buffer`, streams) que no existen en el edge runtime ni en el bundle del cliente. Esta configuración los excluye del bundling del cliente y los mantiene como dependencias nativas del servidor.

**Implicación**: cualquier función que use `exceljs` o `xlsx` debe estar en Route Handlers (`app/api/`) o en Server Components, nunca en componentes cliente (`"use client"`).

---

## Configuración Tailwind (`tailwind.config.ts`)

El sistema de diseño usa tokens **Material 3** con paleta celeste (exportada desde Stitch). Todos los tokens están en el `extend` de Tailwind — no hay ningún color o espaciado hardcodeado en los componentes.

### Colores clave

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#00658E` | Botones, links, acciones primarias |
| `on-primary` | `#FFFFFF` | Texto sobre primary |
| `primary-container` | `#7CC4F2` | Fondos de elementos activos |
| `background` | `#F8F9FF` | Fondo general de la app |
| `surface` | `#F8F9FF` | Fondo de cards |
| `surface-container-lowest` | `#FFFFFF` | Cards internas (tabla, modales) |
| `surface-container-low` | `#EEF4FF` | Filas expandidas |
| `surface-container` | `#E4EFFF` | Sidebar, sections |
| `surface-container-high` | `#DEE9FB` | Headers de sección |
| `surface-variant` | `#D8E3F5` | Bordes, dividers |
| `on-surface` | `#111C29` | Texto principal |
| `on-surface-variant` | `#40484E` | Texto secundario, labels |
| `outline-variant` | `#BFC7CF` | Bordes sutiles |
| `secondary` | `#006D43` | Acciones secundarias (verde) |
| `error` | `#BA1A1A` | Errores |
| `tertiary` | `#6B5391` | Acento morado (pendiente) |

### Tipografía (escala)

| Clase | Tamaño / Line-height | Uso |
|---|---|---|
| `text-display-lg` | 32px / 40px | Títulos de página grandes |
| `text-headline-md` | 24px / 32px | Títulos de sección |
| `text-headline-sm` | 20px / 28px | Subtítulos |
| `text-title-lg` | 18px / 24px | Títulos de cards |
| `text-body-lg` | 16px / 24px | Texto de cuerpo grande |
| `text-body-md` | 14px / 20px | Texto de cuerpo (tablas, listas) |
| `text-label-md` | 12px / 16px | Labels de campo |
| `text-label-sm` | 11px / 14px | Cabeceras de tabla, chips |

### Radios y espaciado

```
rounded-kpi / rounded-button / rounded-input  → 12px
p-margin  → 24px (margen exterior del layout)
p-lg      → 24px
p-md      → 16px
p-sm      → 8px
gap-xl    → 32px
```

---

## Variables de entorno

| Variable | Lado | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + Servidor | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente + Servidor | Clave anon (segura para el cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo Servidor | Salta RLS — solo en Route Handlers |

Las variables `NEXT_PUBLIC_*` se incrustan en el bundle del cliente en build time. La `SERVICE_ROLE_KEY` nunca debe aparecer en componentes con `"use client"` ni en imports que lleguen al cliente.

---

## Clientes Supabase

Hay tres clientes, cada uno para un contexto diferente:

### `lib/supabase/client.ts` — Navegador
```ts
import { createBrowserClient } from "@supabase/ssr";
// Usado en: componentes "use client" que necesitan Supabase directamente.
// Actualmente NO se usa en ningún componente (todo pasa por Server Actions).
```

### `lib/supabase/server.ts` — Servidor (RSC / Server Actions / Route Handlers)
```ts
import { createServerClient } from "@supabase/ssr";
// Lee/escribe cookies de sesión. Respeta RLS según el usuario autenticado.
// Usado en: app/page.tsx, app/actions.ts, app/api/import, app/api/export, lib/data.ts
```

### `lib/supabase/admin.ts` — Service Role (solo import/export)
```ts
import { createClient } from "@supabase/supabase-js";
// Usa SUPABASE_SERVICE_ROLE_KEY. Salta RLS completamente.
// Usado SOLO en: app/api/import/route.ts, app/api/export/route.ts
// Nunca importar desde componentes cliente ni Server Actions de usuario.
```

---

## Esquema de base de datos

### Tabla `public.profiles`

```sql
id     uuid  PK → auth.users(id) ON DELETE CASCADE
nombre text
rol    text  NOT NULL DEFAULT 'jefe'  CHECK (rol IN ('almacen', 'jefe'))
```

- El trigger `on_auth_user_created` la crea automáticamente al registrar un usuario.
- RLS: cada usuario solo puede leer su propia fila.

### Tabla `public.pedidos`

```sql
clave_pedido     text  PK              -- = n_pedido || '|' || n_guia
n_pedido         text  NOT NULL
n_guia           text
cliente          text
destino          text                  -- viene del Excel (Descripcion)
destino_manual   text                  -- edición manual, NUNCA se pisa en el upsert
distrito         text
fecha_programada date                  -- 1ª columna "Fecha de Entrega"
fecha_entrega    date                  -- 2ª columna "Fecha de Entrega"
hora_cita        text
bultos           integer  DEFAULT 0   -- suma de líneas del grupo
observaciones    text
orden_compra     text
cantidad_total   numeric  DEFAULT 0   -- suma de "Cantidad"
vendedor         text
ruc              text
telefono         text
tipo_entrega     text
canal_comercial  text
productos        jsonb    DEFAULT '[]' -- [{codigo, nombre, cantidad}]
estado           text     DEFAULT 'pendiente'  -- NUNCA se pisa en el upsert
actualizado_en   timestamptz  DEFAULT now()
creado_en        timestamptz  DEFAULT now()
```

**Índices**: `idx_pedidos_fecha_programada`, `idx_pedidos_estado`

**Regla de oro del upsert**: el payload de import NO incluye `estado` ni `destino_manual`. En INSERT toman su `DEFAULT`; en `ON CONFLICT DO UPDATE` solo se actualizan los campos presentes en el SET, así que ambos quedan intactos.

### Tabla `public.importaciones`

```sql
id                 bigint  GENERATED ALWAYS AS IDENTITY  PK
archivo            text
filas_consolidadas integer
importado_en       timestamptz  DEFAULT now()
```

Bitácora de cada subida de Excel. No afecta la lógica de negocio.

### Función `public.es_almacen()`

```sql
RETURNS boolean  LANGUAGE sql  SECURITY DEFINER  STABLE
-- Devuelve TRUE si auth.uid() tiene rol = 'almacen' en profiles.
-- SECURITY DEFINER: puede leer profiles incluso si RLS lo bloquearía normalmente.
```

### RLS activo

| Tabla | SELECT | INSERT | UPDATE |
|---|---|---|---|
| `profiles` | Solo la propia fila | — | — |
| `pedidos` | Cualquier usuario autenticado | Solo `es_almacen()` | Solo `es_almacen()` |
| `importaciones` | Cualquier usuario autenticado | Solo `es_almacen()` | — |

### Storage

Bucket `programaciones` — privado. Cada Excel subido se almacena con path `{ISO_timestamp}_{filename}`. La subida usa `createAdminClient` (service_role). Si el bucket no existe, la subida falla silenciosamente y la importación continúa igual.

---

## Tipos TypeScript (`lib/types.ts`)

```ts
type Rol = "almacen" | "jefe"

interface Profile {
  id: string
  nombre: string | null
  rol: Rol
}

interface ProductoLinea {
  codigo: string
  nombre: string
  cantidad: number
}

interface Pedido {
  // Todos los campos de la tabla pedidos.
  // fechas como string ISO 'YYYY-MM-DD' (no Date).
  productos: ProductoLinea[]   // jsonb deserializado
  estado: string
  ...
}

interface PedidoVista extends Pedido {
  destino_efectivo: string     // = destino_manual ?? destino ?? ''
}

interface PedidoConsolidado {
  // Output del ETL, antes de tocar la BD.
  tiene_fecha: boolean         // si fecha_programada !== null
  ...
}
```

---

## Estados (`lib/estados.ts`)

```ts
const ESTADOS = [
  "pendiente", "preparado", "última milla", "en ruta", "entregado",
  "no salió a ruta", "cliente no estaba",
  "reprogramado", "cancelado", "otro"
] as const

type Estado = typeof ESTADOS[number]

// Estados que abren el panel de motivo/fecha antes de confirmar:
const ESTADOS_CON_NOTA = new Set([
  "otro", "cancelado", "no salió a ruta", "cliente no estaba", "reprogramado"
])
```

Paleta de colores por estado (bg, text, border, dot, bar). `colorDeEstado(estado)` devuelve `ESTADO_COLORS.otro` si el estado no existe — no lanza error.

Para agregar un estado nuevo: editar solo este archivo.

---

## Flujo de datos

### Carga de la página principal

```
browser GET /
  → middleware.ts         verifica sesión (cookie) → redirect /login si no hay
  → app/page.tsx          Server Component
      → createClient()    cliente servidor con cookie
      → getPerfil()       profiles WHERE id = user.id
      → getFechasDisponibles()  SELECT fecha_efectiva FROM pedidos (columna generada: coalesce(fecha_reprogramada, fecha_programada))
      → proximaFecha()    elige fecha: primera >= hoy
      → getPedidos(fecha) SELECT * FROM pedidos WHERE fecha_efectiva = ?
      → getUltimaImportacion()  SELECT FROM importaciones ORDER BY importado_en DESC LIMIT 1
      → <Dashboard .../>  pasa todo como props al Client Component
```

### Edición de estado

```
PedidosTable (client) → select onChange
  → setEstadoOv()        update optimista local (UI instantánea)
  → startTransition()
      → actualizarEstado(clave, estado)   Server Action
          → esAlmacen()  verifica rol en BD
          → supabase.from("pedidos").update({ estado })
          → revalidatePath("/")  invalida caché del Server Component
```

### Importación de Excel

```
UploadCard (client) → fetch POST /api/import
  → route.ts
      → verificar sesión + rol almacen
      → leerProgramacion(buffer)   ETL
          → SheetJS: sheet_to_json con header:1, raw:true
          → resolverColumnas(): busca índices por nombre
          → itera filas: consolida grupos por clave_pedido
          → parseFecha(), parseBultos(), parseCantidad()
      → admin.storage.upload()     guarda Excel (best-effort)
      → admin.from("pedidos").upsert()  en lotes de 500
          onConflict: "clave_pedido"
          sin estado ni destino_manual en el payload
      → admin.from("importaciones").insert()
      → { ok, totalLineas, totalPedidos, nuevos, actualizados }
```

### Generación del reporte

```
ReporteSection (client) → GET /api/export?fecha=YYYY-MM-DD
  → route.ts
      → verificar sesión + rol almacen
      → supabase.from("pedidos").select("*").eq("fecha_programada", fecha)
      → aVista() para cada pedido  (agrega destino_efectivo)
      → generarReporte(pedidos)
          → ExcelJS: carga plantilla base64
          → deshace celdas combinadas en zona de datos
          → limpia filas heredadas (valor + estilo + hidden)
          → neutraliza bordes de columna y autofiltro
          → escribe filas B..L con fuente/borde/alineación
          → wb.xlsx.writeBuffer()
      → Response con Content-Disposition attachment
```

---

## Jerarquía de componentes

```
app/page.tsx (Server Component)
└── Dashboard (Client Component)
    ├── Sidebar
    ├── Header
    ├── KpiCards
    ├── EstadoChart        ← Recharts BarChart
    ├── PedidosTable       ← edición inline (estado y destino)
    │   └── EstadoPill     ← solo si !editable
    ├── UploadCard         ← solo si editable (rol almacen)
    └── ReporteSection     ← solo si editable (rol almacen)
```

**Estado del cliente en Dashboard:**
- `estadosSel: Set<string>` — estados seleccionados en el filtro
- `busqueda: string` — texto libre para filtrar
- `collapsed: boolean` — sidebar colapsado o expandido

El filtrado es `useMemo` puro (sin fetch) sobre el array de pedidos que llegó como prop.

**Estado en PedidosTable:**
- `expandida: string | null` — clave del pedido con detalle visible
- `editandoDestino: string | null` — clave del pedido en edición de destino
- `estadoOv: Record<string, string>` — overrides optimistas de estado
- `destinoOv: Record<string, string>` — overrides optimistas de destino

---

## API Routes

### `POST /api/import`

- **Runtime**: `nodejs` (no edge)
- **maxDuration**: 60 s
- **Auth**: sesión válida + `rol === 'almacen'`
- **Body**: `multipart/form-data` con campo `file` (`.xlsx`)
- **Response OK**: `{ ok: true, totalLineas, totalPedidos, nuevos, actualizados }`
- **Response error**: `{ ok: false, error: string }` con status 400/401/403/500

### `GET /api/export?fecha=YYYY-MM-DD`

- **Runtime**: `nodejs`
- **maxDuration**: 60 s
- **Auth**: sesión válida + `rol === 'almacen'`
- **Response OK**: stream `.xlsx` con `Content-Disposition: attachment`
- **Response error**: `{ error: string }` con status 400/401/403

### `POST /auth/signout`

- Llama `supabase.auth.signOut()` y redirige a `/login`.

---

## Middleware (`middleware.ts`)

Se ejecuta en **edge runtime** en cada request que no sea estático.

Lógica:
1. Refresca la sesión desde las cookies del request.
2. Si `!user && !esLogin` → redirect a `/login`.
3. Si `user && esLogin` → redirect a `/`.
4. De lo contrario, deja pasar con la sesión actualizada en cookies.

**Matcher**: excluye `_next/static`, `_next/image`, `favicon.ico` y extensiones de imagen.

**Importante**: el middleware usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, no la service role key — corre en edge y solo refresca tokens.

---

## Archivos de prueba (`Doc tests/`)

| Archivo | Uso |
|---|---|
| `Programacion despachos Akuarian 2026.xlsx` | Excel real de programación para pruebas de import |
| `DESPACHO PENDIENTES 1.xlsx` | Plantilla de referencia del reporte de salida |

---

## Cosas a tener en cuenta al extender el proyecto

1. **Nuevo estado**: editar solo `lib/estados.ts` — el resto del código usa `ESTADOS[]` y `colorDeEstado()` dinámicamente.

2. **Nueva columna del Excel**: agregar el alias en `COLUMNAS` de `lib/etl.ts`, el campo en `PedidoConsolidado` (`lib/types.ts`), la columna en la tabla SQL, el campo en el payload del upsert (`app/api/import/route.ts`), y si corresponde en `Pedido` y `PedidoVista`.

3. **Nueva columna en el reporte**: agregar una entrada en `EXPORT_COLUMNAS` de `lib/export.ts` con la letra de columna correcta.

4. **Nuevo rol**: editar el CHECK en `public.profiles`, la función `es_almacen()` si aplica, y la lógica de permisos en las API routes y Server Actions.

5. **Componente nuevo que necesita datos de BD**: preferir que el Server Component (`app/page.tsx`) los cargue y los pase como props, en lugar de hacer fetch desde el cliente.

6. **exceljs / xlsx en componentes**: nunca importar desde archivos con `"use client"`. Solo en Route Handlers o funciones llamadas solo desde el servidor.

7. **Service role**: `createAdminClient()` solo en `app/api/`. Si se agrega una Server Action que necesite saltar RLS, moverla a una Route Handler en su lugar.
