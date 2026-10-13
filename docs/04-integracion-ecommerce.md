# 04 — Integración con el ecommerce (corto)

Repo de la tienda: <https://github.com/facun3625/corto> (Next 16 · Prisma 7 · Postgres · R2, mismo stack).

## 1. Principios

1. **El ERP es el dueño** de: productos, variantes, atributos, categorías, precios, stock, clientes y
   comprobantes.
2. **La tienda es un canal** (`Channel type = web_store`): vende, cobra (Mercado Pago, Payway,
   transferencia), cotiza envíos (OCA), hace marketing (cupones, mailing, IA, carritos abandonados). Todo eso
   **sigue siendo de la tienda**; no se mueve al ERP.
3. **La tienda se adapta al modelo del ERP** (decisión D-03): su catálogo pasa a ser una copia de lectura
   sincronizada desde Udex. Se toca el código de corto todo lo que haga falta.
4. **Bases separadas**. Cada sistema tiene su Postgres; se hablan por API HTTP + webhooks firmados. Si el
   ERP se cae, la tienda sigue mostrando y vendiendo con su copia (ver §5).
5. **Modo dual en corto**: un flag `ERP_MODE=off|udex`. Con `off` la tienda funciona exactamente como hoy
   (clientes sin ERP). Con `udex`, la edición de catálogo/precios/stock en el panel de la tienda queda en
   solo lectura con un link "Editar en Udex".

## 2. Qué se mueve y hacia dónde

```
                Udex (ERP)                                   corto (tienda)
  ┌─────────────────────────────┐   catálogo, precios,   ┌──────────────────────────┐
  │ Product / Variant / Attr    │ ─ stock disponible ──> │ copia de lectura          │
  │ ChannelListing (web)        │   (webhooks + pull)    │ (Product, Variant, ...)   │
  │ StockBalance / Reservation  │                        │                           │
  │                             │ <── reservar stock ─── │ checkout                  │
  │ SalesDocument (pedido)      │ <── pedido pagado ──── │ Order                     │
  │ FiscalDocument (factura B)  │ ─── factura (PDF) ───> │ mail al cliente / mi cuenta│
  │ Customer                    │ <── cliente ────────── │ User / datos de checkout  │
  └─────────────────────────────┘                        └──────────────────────────┘
              imágenes: mismo bucket Cloudflare R2 (la tienda usa las URLs que manda Udex)
```

## 3. API de Udex para canales (`/api/v1`)

Autenticación: `ApiKey` por canal (header `Authorization: Bearer ...`). Webhooks salientes firmados con
HMAC-SHA256 (`X-Udex-Signature`), con timestamp para evitar replays.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/v1/catalog?updatedSince=` | Sync incremental de productos publicados en el canal (paginado) |
| GET | `/api/v1/catalog/:productId` | Un producto completo |
| GET | `/api/v1/stock?variantIds=` | Disponible por variante para el canal |
| POST | `/api/v1/reservations` | Reservar stock en el checkout (`idempotencyKey` = id del carrito/pedido) |
| DELETE | `/api/v1/reservations/:id` | Liberar (pago rechazado, carrito vencido) |
| POST | `/api/v1/orders` | Pedido confirmado/pagado → crea pedido de venta en Udex (idempotente por nº de pedido) |
| PATCH | `/api/v1/orders/:externalRef` | Cambios de estado: despachado, entregado, cancelado |
| POST | `/api/v1/customers` | Alta/actualización de cliente web |
| GET | `/api/v1/orders/:externalRef/invoice` | Datos y PDF de la factura |

Webhooks Udex → tienda (`POST {tienda}/api/erp/webhook`):
`product.upserted`, `product.unpublished`, `stock.changed` (`variantId`, `available`), `price.changed`,
`category.upserted`, `invoice.issued` (`externalRef`, tipo, número, CAE, `pdfUrl`), `order.status_changed`.

Se emiten desde el `OutboxEvent` del ERP con reintentos exponenciales. Como los webhooks pueden perderse,
la tienda además corre un **pull incremental** cada N minutos (`updatedSince`) que corrige cualquier
diferencia.

## 4. Flujo de una venta web

1. Cliente arma el carrito (la tienda usa su copia de catálogo y stock).
2. **Checkout**: la tienda llama `POST /reservations` con las líneas. Udex bloquea y reserva (o responde
   faltantes → la tienda muestra "sin stock suficiente", igual que hoy `InsufficientStockError`).
3. Pago (MP / Payway / transferencia...) lo maneja la tienda como hoy.
4. Pago aprobado (o pedido "sin pago"/transferencia confirmado por el admin) → `POST /orders`. Udex crea el
   `SalesDocument kind=order` desde la reserva.
5. Según configuración del canal, Udex **factura automáticamente**:
   - `on_paid`: al confirmar el pago (lo más común para Factura B/C), o
   - `on_shipped`: al despachar.
   Con DNI/CUIT y condición IVA del checkout decide A/B/C (ver 03 §4).
6. `invoice.issued` → la tienda guarda el link al PDF, lo agrega al mail al cliente y a "Mi cuenta".
7. Despacho: el descuento físico de stock (`StockMovement sale`) ocurre al despachar desde el depósito
   web (o al facturar, según configuración).
8. Cancelación en la tienda → `PATCH` → Udex libera reserva o emite NC si ya estaba facturada.

## 5. Si el ERP no responde

- El catálogo se sigue mostrando desde la copia local.
- Checkout: si `POST /reservations` falla por red, la tienda puede (configurable) vender contra su copia
  local de stock con el `safetyStock` del canal como colchón, y encolar el pedido para mandarlo cuando
  Udex vuelva. Default: permitido, con aviso en ambos paneles.

## 6. Cambios necesarios en corto

Sin tocar lo que ya funciona en modo `off`:

1. `erpId` (o `externalId`) en `Product`, `Variant`, `Category`, `Attribute`, `AttributeTerm`, `User`,
   `Order` — mismo patrón que hoy `wooId`.
2. **Alinear catálogo con Udex**: en modo `udex`, todo producto tiene variantes (la simple tiene una por
   defecto) y el stock vive en la variante. Corto ya tiene `Attribute` / `AttributeTerm` / `Variant` /
   `VariantAttributeTerm`, que mapean directo a `Attribute` / `AttributeOption` / `Variant` /
   `VariantOptionValue` de Udex. Cantidades en `Decimal` para productos por peso/metro.
3. Atributos descriptivos filtrables (Material, Marca...) para filtros en la tienda.
4. `src/lib/erp/`: cliente HTTP, verificación de firma, handlers de webhook, job de pull incremental.
5. `lib/stock.ts`: en modo `udex`, `checkStock`/descuento llaman a la reserva de Udex en vez de descontar
   local.
6. Checkout: campos opcionales "Necesito factura A" → CUIT + condición IVA (hoy ya pide DNI).
7. Panel: catálogo/precios/stock en solo lectura + "Editar en Udex"; pedido muestra estado de factura y PDF.
8. Mail "Recibimos tu pedido" / estado: adjuntar o linkear la factura.

## 7. Arranque de un cliente que ya tiene tienda

1. **Importar desde corto a Udex** (una vez, como la migración Woo de corto): categorías, atributos,
   productos, variantes, imágenes (mismas URLs de R2, no se re-suben), stock actual como movimiento
   `initial`, clientes. Se guardan los ids de corto como `externalId`.
2. Revisar en Udex, asignar plantillas/precios.
3. Activar `ERP_MODE=udex` en la tienda → primer sync completo → desde ahí manda Udex.

## 8. A futuro

El mismo módulo `channels/` sirve para Mercado Libre, Tiendanube u otros: cada uno es un `Channel` con su
adaptador.
