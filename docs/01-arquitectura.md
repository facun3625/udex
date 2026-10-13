# 01 — Arquitectura

## 1. Stack

Igual que el resto de las apps (y que el ecommerce corto), para reusar conocimiento, scripts y deploy:

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19 + Tailwind 4 + lucide-react |
| Lenguaje | TypeScript estricto |
| Base de datos | PostgreSQL 16 (Docker en el VPS) |
| ORM | Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`) |
| Auth | NextAuth 5 (Credentials + opcional Google) |
| Imágenes / archivos | **Cloudflare R2** (S3 API, `@aws-sdk/client-s3`), igual que corto: imágenes de productos, PDFs de comprobantes, certificados no (esos van cifrados en la base) |
| PDF | `@react-pdf/renderer` o HTML → PDF con Playwright (decisión D-07) |
| SOAP ARCA | `fetch` + armado de XML a mano + `xml2js` para leer (ya se usa en corto) |
| Firma WSAA | `node-forge` (PKCS#7/CMS) |
| Mail | nodemailer (SMTP) / Resend, como corto |
| Tests | `node --test` (unidad) + e2e contra base descartable `<db>_e2e`, como corto |
| Deploy | VPS: PM2 + Nginx + Postgres en Docker, `scripts/deploy.sh` (misma guía que corto) |

## 2. Modelo de despliegue

**Una instalación por cliente** (como las demás apps): su propio proceso, su propia base, su dominio.
Dentro de una instalación puede haber **varias empresas** (razones sociales / CUIT) y **varias sucursales**,
porque es común que un mismo dueño facture con más de un CUIT. Ver D-01.

```
cliente.udex.com.ar ──> Nginx ──> Udex (Next, PM2) ──> Postgres (Docker)
                                        │  ├──> ARCA (WSAA / WSFEv1 / Padrón)
                                        │  ├──> Cloudflare R2 (imágenes, PDFs)
                                        │  └──> Tienda corto (API + webhooks)
tienda.cliente.com ──> corto (Next) ────┘
```

## 3. Estructura de carpetas

```
udex/
├─ prisma/schema.prisma          # un solo schema, secciones comentadas por módulo
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login
│  │  ├─ (panel)/                # todo el ERP, layout con sidebar
│  │  │  ├─ productos/  stock/  ventas/  pos/  compras/
│  │  │  ├─ clientes/  proveedores/  caja/  reportes/  configuracion/
│  │  └─ api/
│  │     ├─ v1/                  # API pública para canales (tienda): catálogo, stock, pedidos
│  │     └─ webhooks/
│  ├─ modules/                   # LÓGICA DE NEGOCIO (sin React), con tests
│  │  ├─ catalog/                # productos, variantes, atributos, plantillas, precios
│  │  ├─ inventory/              # movimientos, saldos, reservas, transferencias, conteos
│  │  ├─ sales/                  # documentos de venta, numeración interna
│  │  ├─ purchasing/
│  │  ├─ fiscal/                 # ARCA: wsaa, wsfe, padron, qr, cálculo de IVA
│  │  ├─ accounts/               # cuentas corrientes clientes / proveedores
│  │  ├─ treasury/               # cajas, medios de pago, arqueos
│  │  ├─ channels/               # integración con tiendas (corto) — outbox, sync
│  │  └─ core/                   # empresa, sucursal, usuarios, permisos, auditoría, numeradores
│  ├─ components/                # UI compartida (tablas, formularios, buscador de productos)
│  └─ lib/                       # prisma, auth, r2, money (Decimal), mailer, crypto
├─ tests/                        # unit (node --test) y e2e/
└─ docs/
```

Regla: `app/` llama a `modules/`; `modules/` no importa nada de `app/` ni de React.

## 4. Multiempresa (aislamiento de datos)

- Tabla `Company` (CUIT, razón social, condición IVA, certificado ARCA). Toda tabla de negocio tiene
  `companyId`.
- La empresa activa vive en la sesión. Un helper `db(ctx)` / funciones de módulo reciben siempre
  `{ companyId, userId }` y filtran por empresa. **Prohibido** hacer `prisma.x.findMany()` sin `companyId`
  fuera de `core/`.
- Catálogo: ¿compartido entre empresas de la misma instalación? Sí por defecto (`Product.companyId` puede
  ser el "grupo"); ver D-02. El stock y los comprobantes siempre son por empresa/sucursal.

## 5. Permisos

Roles con permisos granulares (`sales.create`, `sales.void`, `stock.adjust`, `fiscal.issue`,
`prices.edit`, `reports.view`...). Roles semilla: Dueño, Administrador, Vendedor, Cajero, Depósito,
Contador. El usuario puede tener rol distinto por sucursal. Toda acción sensible se re-valida en el servidor.

## 6. Auditoría

`AuditLog` (quién, qué, cuándo, antes/después) para: precios, ajustes de stock, anulaciones, emisión
fiscal, cambios de configuración. Mismo espíritu que `AdminLog` de corto, pero con `before/after` JSON.

## 7. Patrones transversales

- **Ledger, no contadores**: el stock y las cuentas corrientes son la suma de movimientos inmutables.
  Se guarda además un saldo materializado (para leer rápido) que se actualiza en la misma transacción.
- **Locks**: `pg_advisory_xact_lock` por SKU+depósito (como `lib/stock.ts` de corto) y por
  CUIT+punto de venta+tipo de comprobante para numerar en ARCA.
- **Idempotencia**: toda entrada externa (pedido de la tienda, reintento de factura) trae una
  `idempotencyKey` única.
- **Outbox**: eventos que hay que mandar afuera (stock cambiado → tienda, factura emitida → mail) se
  escriben en una tabla `OutboxEvent` en la misma transacción y un worker los despacha con reintentos.
- **Worker**: proceso PM2 separado (`npm run worker`) para outbox, reintentos ARCA, sync con tiendas.
- **Secretos**: certificados/claves ARCA y tokens de API se guardan cifrados (AES-256-GCM con una clave del
  `.env`), igual criterio que `backupCrypto` de corto.
