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
