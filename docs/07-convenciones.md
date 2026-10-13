# 07 — Convenciones

Basadas en cómo está hecho corto, con los ajustes que pide un ERP.

## Idioma

- UI, docs y comentarios en **español rioplatense** (como corto).
- Código (variables, funciones, modelos, rutas de API) en **inglés**. Rutas de páginas del panel en
  español (`/productos`, `/ventas`).

## Código

- TypeScript estricto. Sin `any` salvo en bordes (XML de ARCA parseado) y siempre validado.
- Lógica de negocio en `src/modules/<modulo>/*.ts` como funciones que reciben `ctx` (`companyId`,
  `userId`, `branchId`) y, cuando escriben, un `tx` de Prisma. Páginas y server actions solo validan
  input (zod), chequean permiso y llaman al módulo.
- Validación de entrada con **zod** en todo server action y endpoint.
- Comentarios: explicar el **por qué** (reglas de negocio, requisitos de ARCA), como en el schema de corto.

## UI

- **Canvas blanco**: el fondo de página y el de las tarjetas es el mismo blanco (`bg`/`surface`); se
  diferencian con un borde fino (`border-line`) y una sombra muy sutil (ver `Card`), no con un gris de
  fondo. `surface-2` queda para estados de hover/activo y para el fondo tenue de las pantallas sueltas
  (login, seleccionar sucursal, onboarding) detrás de su tarjeta — nunca como fondo de todo el panel.
- **Ancho**: el panel centra el contenido hasta 1400px (`PanelShell`), así que las páginas no deberían
  ponerse su propio `max-w-*` salvo que sea un formulario angosto a propósito (login, una tarjeta de
  alta). Las pantallas de listado (tablas, grillas de accesos) usan todo ese ancho.
- **Colores solo con tokens** (`bg-surface`, `bg-surface-2`, `border-line`, `text-muted`, `bg-accent`,
  `text-on-accent`, `bg-ok-soft`/`text-ok`, `warn`, `danger`), definidos en `src/app/globals.css` para
  claro y oscuro. Nunca `bg-white`, `text-gray-500` ni colores sueltos.
- **Usar el kit** de `src/components/ui/`: `Button`/`LinkButton`, `Field` + `Input`/`Select`/`Textarea`,
  `DecimalInput` (importes y cantidades es-AR), `Card`, `PageHeader`, `Badge`, `Alert`, `EmptyState`,
  `DataTable` + `Pagination`, `SearchBox`/`FilterSelect`, `useToast()` y `useConfirm()`.
- **Listados**: paginados y filtrados en el servidor con `parseListParams` (estado en la URL). Ver
  `src/app/(panel)/auditoria/page.tsx` como ejemplo de referencia.
- Importes y cantidades con la clase `tabular` (números alineados) y alineados a la derecha.
- Todo tiene que andar en celular (390 px) y en modo oscuro: probarlo antes de dar una pantalla por hecha.
- Menú: agregar la sección en `src/modules/core/menu.ts` con su permiso/módulo y `ready: true` cuando
  esté construida.

## Plata y cantidades

- `Decimal` de Prisma (`decimal.js`) siempre. **Nunca `Float`** (corto usa Float; en el ERP no se admite).
- Redondeo solo en los puntos definidos (`money.ts`): 2 decimales para importes, 4 internos, cantidades
  según `Unit.decimals`.
- Nunca confiar en totales que vienen del cliente o de la tienda: el servidor recalcula.

## Base de datos

- Toda tabla de negocio con `companyId` + índice. Toda consulta filtra por empresa.
- Ledger inmutable (stock, cuentas corrientes, comprobantes fiscales): no hay UPDATE/DELETE de
  movimientos, se compensan.
- Comprobantes con CAE **no se borran nunca**.
- Migraciones: `prisma migrate dev --name <accion_modelo>`; nunca editar una migración aplicada.
  Si el entorno es no interactivo (un agente de IA, CI) y Prisma pide confirmar porque detecta posible
  pérdida de datos (índice único nuevo, etc.), `migrate dev` directamente falla en vez de preguntar. Con
  la tabla vacía o sin filas duplicadas eso es solo el modo interactivo molestando: generar el SQL con
  `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, pegarlo a
  mano en `prisma/migrations/<timestamp>_<nombre>/migration.sql` y aplicarlo con `prisma migrate deploy`.
- Operaciones que tocan stock o numeración: transacción + `pg_advisory_xact_lock` en orden estable.

## Tests

- `node --test tests/` para lógica pura (totales, IVA, tipo de comprobante, QR, conversión de unidades,
  generador de variantes). Toda función de `modules/` que calcula algo tiene test.
- E2E contra base descartable `<db>_e2e` (patrón de corto). ARCA solo homologación con `ARCA_E2E=1`.
- Una tarea del roadmap no está terminada sin sus tests pasando.

## Git

- Rama por tarea: `f1-2-stock-ledger`. Commit/PR con el ID de la tarea: `F1.2: ledger de stock`.
- Actualizar `docs/05-roadmap.md` y `CHANGELOG.md` en el mismo PR.

## Seguridad

- **El repo es público**: jamás commitear `.env`, certificados (`.crt`, `.key`, `.pem`, `.csr`), dumps
  ni datos de clientes. Credenciales de ejemplo solo en `.env.example`, sin valores reales.
- Secretos (certificados ARCA, API keys, SMTP) cifrados en la base; nunca se devuelven al navegador.
- Permiso chequeado en el servidor en cada acción, aunque el botón esté oculto en la UI.
- Webhooks: verificar firma HMAC y timestamp; respuestas idempotentes.
