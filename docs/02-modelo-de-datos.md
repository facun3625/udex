# 02 — Modelo de datos

> Orden de diseño (decisión D-03): **primero el stock**, después el catálogo que lo alimenta, y recién
> después cómo se publica en la tienda. La tienda (corto) se adapta a este modelo, no al revés.
>
> Los bloques de Prisma de abajo son **bosquejos de referencia**: nombres y relaciones acordados. Al
> implementar se completan con índices, `createdAt/updatedAt` y `companyId` donde falte.

Convenciones: ids `cuid()`; dinero `Decimal(18,4)`; cantidades `Decimal(18,4)`; porcentajes
`Decimal(9,4)`; toda tabla de negocio con `companyId`.

---

## 1. Núcleo de stock

### 1.1 Qué se stockea: el SKU (`Variant`)

**Todo producto tiene al menos una variante.** Un producto simple tiene una sola variante "por defecto"
(invisible en la UI). Así el stock, el precio, el código de barras y las líneas de venta **siempre** apuntan a
`variantId`, sin el doble camino producto/variante que tiene hoy corto.

### 1.2 Dónde está: ubicaciones

```
Company (CUIT) ─< Branch (sucursal) ─< Warehouse (depósito) ─< Bin (ubicación, opcional: "A-03-2")
```

- Un depósito puede ser físico (local, galpón) o lógico ("En tránsito", "Mercadería fallada",
  "Consignación").
- Cada sucursal tiene un depósito por defecto para vender.

### 1.3 Cómo cambia: movimientos (ledger inmutable)

Cada cambio de stock es una fila de `StockMovement`. **Nunca se edita ni se borra**: un error se corrige
con un movimiento inverso.

```prisma
model StockMovement {
  id             String   @id @default(cuid())
  companyId      String
  variantId      String
  warehouseId    String
  binId          String?
  lotId          String?
  serialId       String?
  quantity       Decimal  @db.Decimal(18, 4)  // con signo: + entra, - sale. En unidad base.
  unitCost       Decimal? @db.Decimal(18, 4)  // costo unitario de la entrada (para valorizar)
  type           StockMovementType
  // Documento que lo originó (venta, recepción, transferencia, ajuste, conteo...)
  sourceType     String   // "sales_document" | "goods_receipt" | "transfer" | "adjustment" | "count" | "channel_order"
  sourceId       String
  sourceLineId   String?
  idempotencyKey String?  @unique
  note           String?
  userId         String?
  createdAt      DateTime @default(now())

  @@index([companyId, variantId, warehouseId, createdAt])
  @@index([sourceType, sourceId])
}

enum StockMovementType {
  initial            // carga inicial
  purchase_receipt   // recepción de compra
  purchase_return    // devolución a proveedor
  sale               // venta / entrega (remito o factura con entrega)
  sale_return        // devolución de cliente (nota de crédito con reingreso)
  adjustment         // ajuste manual con motivo (rotura, robo, regalo, error)
  count              // diferencia de conteo físico
  transfer_out
  transfer_in
  kit_assembly       // armado de kits / producción simple
  kit_disassembly
}
```

### 1.4 Cuánto hay: saldos materializados

Leer sumando el ledger es lento; se mantiene un saldo que se actualiza **en la misma transacción** que el
movimiento (con `pg_advisory_xact_lock` por `variantId+warehouseId`, como `lib/stock.ts` de corto).

```prisma
model StockBalance {
  id          String  @id @default(cuid())
  companyId   String
  variantId   String
  warehouseId String
  lotId       String?             // null = sin control de lote
  onHand      Decimal @db.Decimal(18, 4) @default(0)  // físico
  reserved    Decimal @db.Decimal(18, 4) @default(0)  // comprometido por pedidos/reservas
  incoming    Decimal @db.Decimal(18, 4) @default(0)  // en órdenes de compra / transferencias en camino
  // disponible = onHand - reserved  (se calcula, no se guarda)

  @@unique([variantId, warehouseId, lotId])
}
```

Hay un job de verificación (`inventory:verify`) que recalcula `onHand` desde el ledger y alerta si difiere.

### 1.5 Reservas

Un pedido no entregado (pedido de venta, pedido web pagado esperando despacho) **reserva**, no descuenta.
El descuento real (`StockMovement` tipo `sale`) ocurre al entregar/facturar con entrega.

```prisma
model StockReservation {
  id          String   @id @default(cuid())
  companyId   String
  variantId   String
  warehouseId String
  quantity    Decimal  @db.Decimal(18, 4)
  sourceType  String   // "sales_order" | "channel_order" | "cart_hold"
  sourceId    String
  status      ReservationStatus  // active | consumed | released | expired
  expiresAt   DateTime?          // reservas de carrito vencen solas
  createdAt   DateTime @default(now())
}
```

### 1.6 Stock por canal

Qué stock ve cada canal (mostrador, tienda web, mayorista) se define por configuración, no por copias:

```prisma
model ChannelWarehouse {
  channelId   String
  warehouseId String
  @@id([channelId, warehouseId])
}
// Channel: { id, companyId, type: "pos" | "web_store" | "wholesale" | "marketplace", name,
//            safetyStock Decimal (colchón que se resta), priceListId }
```

Disponible para el canal = Σ (onHand − reserved) de sus depósitos − `safetyStock`.

### 1.7 Lotes, vencimientos y series (opcionales por producto)

```prisma
model Lot {           // si Product.trackLots
  id String @id @default(cuid())
  companyId String
  variantId String
  code      String
  expiresAt DateTime?
  @@unique([variantId, code])
}

model SerialNumber {  // si Product.trackSerials (cantidad siempre 1 por serie)
  id String @id @default(cuid())
  companyId   String
  variantId   String
  serial      String
  status      SerialStatus   // in_stock | reserved | sold | returned | defective
  warehouseId String?
  @@unique([variantId, serial])
}
```

Venta de producto con lote: se sugiere FEFO (primero el que vence antes).

### 1.8 Unidades de medida

```prisma
model Unit {             // un, kg, g, m, cm, lt, ml, caja, par, docena...
  id        String @id @default(cuid())
  companyId String
  code      String   // "kg"
  name      String
  decimals  Int      // 0 para unidad, 3 para kg
}
model UnitConversion {   // por producto: 1 "caja" = 12 "un"
  productId  String
  unitId     String
  factor     Decimal @db.Decimal(18, 6)   // cuántas unidades base
  barcode    String? // la caja puede tener su propio EAN
  @@id([productId, unitId])
}
```

El stock **siempre** se guarda en la unidad base del producto; las líneas de compra/venta guardan la unidad
usada y el factor aplicado.

### 1.9 Documentos de inventario

- `StockReceipt` **ingreso de mercadería por escaneo** (borrador autoguardado → confirmado), ver 08 §6.
- `StockAdjustment` (+ líneas, motivo obligatorio, permiso `stock.adjust`).
- `StockTransfer` estados `draft → sent → received` (al enviar: `transfer_out` del origen + `incoming` en
  destino; al recibir: `transfer_in`). Diferencias al recibir quedan registradas.
- `InventoryCount` (conteo total o parcial por depósito/categoría): se congela el teórico, se cargan
  cantidades (con lector de código de barras), y al cerrar se generan movimientos `count`.

### 1.10 Reposición

`StockRule { variantId, warehouseId, min, max, reorderPoint }` → alertas de faltantes y sugerencia de orden
de compra por proveedor.

### 1.11 Valorización

Costo promedio ponderado (CPP) por variante y empresa, recalculado en cada recepción de compra
(`VariantCost { variantId, companyId, avgCost, lastCost, updatedAt }`). FIFO queda para más adelante (D-05).

### 1.12 Stock negativo

Configurable por empresa y por depósito: `block` (default) | `warn` | `allow`. El POS de mostrador en
algunos rubros necesita poder vender aunque el sistema diga 0.

### 1.13 Códigos de barras (parte del núcleo de stock)

`Barcode { code, variantId, unitId?, factor }` se crea **junto con `Variant` en F1**, porque el ingreso de
mercadería, la caja y el conteo se operan escaneando. Un código → una variante; una variante → muchos
códigos (fabricante, caja x12 con `factor` 12, interno, PLU de balanza). Detalle completo, flujos y
pantallas en [08-codigos-de-barras.md](08-codigos-de-barras.md).

Todo documento que mueve stock por escaneo (ingreso, venta, conteo) guarda en la línea el `scannedCode`
leído, para trazabilidad.

### 1.14 Kits / combos

`Product.type = kit` con `KitComponent { kitProductId, componentVariantId, quantity }`. Vender un kit
descuenta componentes; el disponible del kit = mínimo de (disponible componente / cantidad).

---

## 2. Catálogo universal

### 2.1 Producto y variante

```prisma
model Product {
  id           String  @id @default(cuid())
  companyId    String
  name         String
  slug         String
  type         ProductType       // standard | service | kit
  status       ProductStatus     // draft | active | archived
  description  String?
  categoryId   String?           // categoría principal (árbol)
  brandId      String?
  templateId   String?           // plantilla de atributos (ver 2.2)
  baseUnitId   String
  ivaRate      Decimal @db.Decimal(5, 2)   // 21, 10.5, 27, 5, 2.5, 0 → mapea a Id de alícuota ARCA
  trackStock   Boolean @default(true)      // false para servicios
  trackLots    Boolean @default(false)
  trackSerials Boolean @default(false)
  weightKg / widthCm / heightCm / lengthCm  Decimal?   // defaults para variantes (envíos)
  variants     Variant[]
  images       ProductImage[]    // en Cloudflare R2
  attributeValues ProductAttributeValue[]
  channelListings ChannelListing[]  // publicación por canal (ver 2.5)
}

model Variant {
  id        String  @id @default(cuid())
  companyId String
  productId String
  sku       String               // único por empresa
  isDefault Boolean @default(false)
  enabled   Boolean @default(true)
  barcodes  Barcode[]            // varios EAN/UPC/propios por variante — ver 08-codigos-de-barras.md
  options   VariantOptionValue[] // combinación de ejes: Talle=M, Color=Negro
  imageId   String?
  weightKg / widthCm / heightCm / lengthCm  Decimal?
  @@unique([companyId, sku])
}
```

### 2.2 Atributos y plantillas (lo que lo hace multirubro)

```prisma
model Attribute {
  id        String @id @default(cuid())
  companyId String
  name      String              // "Talle", "Color", "Diámetro", "Varietal"
  code      String              // "talle"
  type      AttributeType       // text | number | select | multiselect | color | boolean | date
  unit      String?             // para number: "mm", "cm", "ml"
  filterable Boolean @default(true)   // se usa como filtro en la tienda
  options   AttributeOption[]
}
model AttributeOption {          // valores de select / color
  id String @id @default(cuid())
  attributeId String
  value     String               // "M", "Negro", "Malbec"
  colorHex  String?
  sortOrder Int @default(0)
}
model ProductTemplate {          // "Remera", "Tornillo", "Vino"
  id String @id @default(cuid())
  companyId String
  name String
  attributes TemplateAttribute[]
}
model TemplateAttribute {
  templateId  String
  attributeId String
  role        AttrRole           // descriptive (del producto) | variant_axis (genera variantes)
  required    Boolean @default(false)
  sortOrder   Int @default(0)
  @@id([templateId, attributeId])
}
model ProductAttributeValue {    // valores descriptivos a nivel producto (Material = Algodón)
  productId String; attributeId String
  optionIds String[]             // para select/multiselect/color
  valueText String?; valueNumber Decimal?; valueBool Boolean?; valueDate DateTime?
}
model VariantOptionValue {       // valores de ejes a nivel variante
  variantId String; attributeId String; optionId String
  @@id([variantId, attributeId])
}
```

Generador de variantes: se eligen opciones de cada eje (Talle: S, M, L × Color: Negro, Blanco) → crea las 6
variantes con SKU autogenerado por patrón configurable (`{CODIGO}-{TALLE}-{COLOR}`), editable.

**Plantillas de rubro** (`seed/rubros/*.json`): indumentaria, calzado, ferretería, almacén/alimentos,
electrónica, farmacia/perfumería, librería, autopartes, servicios. Cada una precarga unidades, atributos,
plantillas y categorías. Solo datos.

### 2.3 Clasificación

- `Category` en árbol (igual que corto), con `templateId` por defecto.
- `Brand` (marca).
- `Tag` libre.

### 2.4 Precios

```prisma
model PriceList {
  id String @id @default(cuid())
  companyId    String
  name         String       // "Minorista", "Mayorista", "Web"
  currency     Currency     // ARS | USD
  taxIncluded  Boolean      // true: precios finales con IVA (minorista)
  baseListId   String?      // lista derivada...
  adjustPct    Decimal?     // ...con % sobre la base (mayorista = minorista -20%)
  rounding     String?      // regla de redondeo: "none" | "10" | "99"
}
model PriceListItem {
  priceListId String; variantId String
  price       Decimal @db.Decimal(18, 4)
  minQty      Decimal @default(1)   // escalas por cantidad
  @@id([priceListId, variantId, minQty])
}
```

Además: actualización masiva de precios (% por categoría/marca/proveedor), historial de precios, precio
promocional con vigencia.

### 2.5 Publicación en canales (la tienda)

```prisma
model ChannelListing {
  channelId   String
  productId   String
  published   Boolean @default(false)
  title       String?   // override del nombre para la web
  description String?   // override de descripción (HTML)
  seoTitle    String?; seoDescription String?
  featured    Boolean @default(false)
  externalId  String?   // id del producto en la tienda (si difiere)
  @@id([channelId, productId])
}
```

El precio de la tienda sale de la `priceListId` del canal; el stock, de §1.6.

---

## 3. Terceros

- `Customer`: tipo y número de documento (CUIT/CUIL/DNI), condición frente al IVA (para ARCA: RI,
  Monotributo, Exento, Consumidor Final...), razón social, domicilios, lista de precios, límite de crédito,
  `externalIds` (cliente de la tienda).
- `Supplier`: idem + `SupplierProduct { supplierId, variantId, supplierSku, lastCost, currency }`.
- Datos por CUIT autocompletables desde el padrón de ARCA.

## 4. Ventas

```prisma
model SalesDocument {
  id String @id @default(cuid())
  companyId    String
  branchId     String
  kind         SalesDocKind     // quote | order | delivery_note | invoice | credit_note | debit_note
  status       SalesDocStatus   // draft | confirmed | fiscal_pending | authorized | rejected | cancelled
  number       Int              // numeración interna por (company, kind, pointOfSale)
  date         DateTime
  customerId   String?
  customerSnapshot Json         // nombre, doc, condición IVA, domicilio AL MOMENTO de emitir
  priceListId  String?
  currency     Currency; exchangeRate Decimal
  channelId    String?          // pos, web_store...
  externalRef  String?          // nº de pedido de la tienda
  idempotencyKey String? @unique
  // Totales
  netTotal Decimal; ivaTotal Decimal; otherTaxes Decimal; total Decimal
  // Relaciones entre documentos (pedido → remito → factura; factura → NC)
  relatedFromId String?
  fiscal       FiscalDocument?  // ver 03-facturacion-arca.md
  lines        SalesDocumentLine[]
  taxes        SalesDocumentTax[]  // subtotales por alícuota (lo que pide ARCA)
}
model SalesDocumentLine {
  id String @id @default(cuid())
  documentId String
  variantId  String?            // null = línea libre (ej. "Servicio de instalación")
  description String
  quantity   Decimal; unitId String; unitFactor Decimal
  unitPrice  Decimal            // sin IVA
  discountPct Decimal @default(0)
  ivaRate    Decimal
  netAmount Decimal; ivaAmount Decimal; total Decimal
  warehouseId String?; lotId String?; serialIds String[]
}
```

Reglas:
- La factura que **entrega** mercadería genera `StockMovement sale`. Si viene de un remito ya entregado,
  no vuelve a descontar.
- La NC con "reingresa mercadería" genera `sale_return`.
- Los importes se calculan en `modules/sales/totals.ts` (función pura, muy testeada), redondeo a 2
  decimales por línea y por alícuota según criterio ARCA.

## 5. Compras

`PurchaseOrder` → `GoodsReceipt` (genera `purchase_receipt` y actualiza CPP) → `PurchaseInvoice`
(comprobante del proveedor: tipo, punto de venta, número, CAE, percepciones; alimenta libro IVA compras).

## 6. Cuentas corrientes y tesorería

- `AccountEntry` (ledger por cliente/proveedor): débito por factura, crédito por recibo/NC.
- `Receipt` (recibo de cobro) y `PaymentOrder` (orden de pago) con imputación a comprobantes.
- `CashRegister` (caja) / `CashSession` (apertura, cierre, arqueo por medio de pago).
- `PaymentMethod` (efectivo, débito, crédito, transferencia, Mercado Pago, cheque) con recargos/descuentos
  y cuotas.
- `Cheque` (cartera de cheques: recibidos, depositados, endosados).

## 7. Core

`Company`, `Branch`, `User`, `Role`, `Permission`, `UserBranchRole`, `AuditLog`, `Sequence` (numeradores
con lock), `OutboxEvent`, `Setting`, `ApiKey` (para canales).
