# 08 — Códigos de barras y escaneo

El escaneo es **la forma principal de operar** el stock y la caja, no un extra. Un solo motor de escaneo
se usa en tres pantallas:

| Pantalla | Qué hace cada escaneo | Fase |
|---|---|---|
| **Ingreso de mercadería** | Suma cantidad que entra al depósito | F1 |
| **Venta por caja (POS)** | Agrega el producto al ticket | F3 |
| **Conteo físico** | Suma cantidad contada | F1 |

(Después también: recepción contra orden de compra (F6), transferencias, armado de pedidos web.)

## 1. Hardware

- **Lector tipo pistola USB o Bluetooth en modo teclado (HID)**: escribe el código y manda Enter. No
  necesita driver ni nada instalado. Es el caso principal.
- **Cámara del celular** (PWA de depósito): `BarcodeDetector` del navegador, y si no está, `@zxing/browser`.
  Para depósito y conteos sin pistola.
- **Balanza con etiqueta** (almacén, carnicería, verdulería): códigos EAN-13 de peso o precio variable
  (ver §5).

## 2. Modelo

```prisma
model Barcode {
  id        String  @id @default(cuid())
  companyId String
  code      String            // tal cual lo lee la pistola (sin espacios)
  variantId String
  unitId    String?           // null = unidad base. "caja" → el escaneo suma `factor` unidades
  factor    Decimal @db.Decimal(18, 6) @default(1)
  type      BarcodeType       // ean13 | ean8 | upca | code128 | internal
  isPrimary Boolean @default(false)   // el que se imprime en la etiqueta
  createdAt DateTime @default(now())

  @@unique([companyId, code])   // un código = un solo SKU en la empresa
  @@index([variantId])
}
```

- Una variante puede tener **varios códigos** (el del fabricante, el de otro proveedor, el de la caja x12,
  uno interno).
- Un código pertenece a **una sola** variante (si se intenta repetir, se avisa a qué producto pertenece).
- Productos sin código del fabricante: Udex genera un **EAN-13 interno** (prefijo `2`, configurable, con
  dígito verificador) y se imprimen etiquetas.

## 3. Resolución de un código (`modules/catalog/barcode.ts`)

```ts
resolveScan(ctx, raw: string): Promise<
  | { kind: "variant"; variantId: string; quantity: Decimal; unitId?: string; price?: Decimal; lotCode?: string }
  | { kind: "unknown"; code: string }
>
```

Orden:
1. Normalizar (trim, sacar caracteres de control; UPC-A de 12 ↔ EAN-13 con 0 adelante).
2. Si coincide con el patrón de **balanza** (§5) → decodificar código de artículo + peso/precio.
3. Buscar en `Barcode` (índice único → < 10 ms).
4. Si no está, buscar como **SKU** exacto.
5. Si no, `unknown`.

Devuelve la cantidad ya multiplicada por el `factor` (escanear la caja x12 suma 12).

En el POS, el mapa `código → variante` puede cachearse en el navegador al abrir la caja, para que el
escaneo responda al instante aunque la red esté lenta. El servidor revalida todo al cobrar.

## 4. Componente de escaneo (`components/scan/ScanInput.tsx`)

- Campo siempre enfocado (se vuelve a enfocar solo después de cada acción o modal).
- Detecta la pistola: caracteres llegando muy rápido + Enter. Si una persona tipea un código a mano y
  pulsa Enter, también funciona.
- **Sonido y color**: bip corto + verde si se encontró; bip doble + rojo si no. Vibración en celular.
- **Multiplicador**: tipear `6*` (o `6` + tecla `×`) y después escanear → suma 6 de una vez.
- Mismo código escaneado otra vez → **suma a la línea existente** (no crea otra línea).
- Línea recién tocada resaltada y arriba; atajos de teclado: `+` / `-` sobre la última línea, `Supr`
  para borrarla, `F2` para editar cantidad.
- Funciona con decimales cuando la unidad lo permite (kg, m).

## 5. Etiquetas de balanza (peso / precio variable)

Configurable por empresa (cada balanza usa un formato). Ejemplo típico EAN-13:

```
2 0 CCCCC PPPPP V
│ │   │     │   └ dígito verificador
│ │   │     └──── peso en gramos (o precio con 2 decimales)
│ │   └────────── código de artículo de la balanza (= PLU)
└─┴────────────── prefijo 20–29
```

```prisma
model ScaleBarcodeFormat {
  id String @id @default(cuid())
  companyId    String
  prefix       String   // "20"
  itemDigits   Int      // 5
  valueDigits  Int      // 5
  valueType    String   // "weight" | "price"
  valueDecimals Int     // 3 para kg (gramos), 2 para precio
}
// El PLU se vincula a la variante con un Barcode type "internal" de code = PLU.
```

## 6. Flujo: ingreso de mercadería por escaneo (F1)

Pantalla **Stock → Ingreso de mercadería**.

1. Elegir **depósito** (default: el de la sucursal). Opcional: proveedor y nº de remito/factura del
   proveedor (texto libre en F1; en F6 se vincula a la orden de compra).
2. Modo de cantidad (se recuerda por usuario):
   - **Cada escaneo suma 1**: ideal para pocas unidades.
   - **Escanear y tipear cantidad**: al escanear, el foco salta a "Cantidad", se tipea `24` + Enter y
     vuelve al escáner. Ideal cuando llegan bultos.
3. Por cada producto conocido aparece la línea: producto, variante (talle/color), cantidad, **costo
   unitario** (opcional, precargado con el último costo; alimenta el costo promedio), stock actual → stock
   nuevo.
4. Si el producto controla **lote/vencimiento**, pide lote y fecha al agregarlo (con lector, se puede
   escanear el lote). Si controla **serie**, cada escaneo siguiente se toma como un número de serie hasta
   completar la cantidad.
5. **Código desconocido** → modal con dos opciones:
   - **Asociar a un producto existente** (buscador por nombre/SKU): guarda el código en esa variante.
     Útil cuando el proveedor cambió el código o es la caja.
   - **Crear producto rápido**: nombre, plantilla/categoría, variante (si aplica), precio de venta, IVA,
     costo. El código queda guardado. El resto del producto se completa después (queda marcado
     "incompleto").
   - O **saltear** (queda en una lista de "códigos no resueltos" del ingreso).
6. El borrador se **guarda solo** mientras se escanea (no se pierde si se cierra la pestaña o se corta la
   luz). Se puede dejar en pausa y retomar.
7. **Confirmar** → un documento `StockReceipt` + un `StockMovement purchase_receipt` por línea, en una
   transacción. Actualiza costo promedio. Opción de imprimir etiquetas de lo que entró.

```prisma
model StockReceipt {      // en F6 se suma purchaseOrderId / supplierId real
  id String @id @default(cuid())
  companyId   String
  warehouseId String
  status      String    // draft | confirmed | cancelled
  supplierName String?
  supplierDocRef String? // remito / factura del proveedor
  lines       StockReceiptLine[]
  confirmedAt DateTime?
  userId      String
}
model StockReceiptLine {
  id String @id @default(cuid())
  receiptId String
  variantId String
  quantity  Decimal; unitId String?; unitFactor Decimal
  unitCost  Decimal?
  lotCode String?; lotExpiresAt DateTime?; serials String[]
  scannedCode String?    // el código leído (trazabilidad)
}
```

## 7. Flujo: venta por caja (POS, F3)

Pantalla **Caja** (pantalla completa, pensada para teclado + pistola, sin mouse).

1. Caja abierta (sesión de caja) y cliente "Consumidor final" por defecto.
2. **Escanear** → agrega la línea con el precio de la lista de precios de la caja/cliente. Cantidad 1, o
   lo que diga el multiplicador o la etiqueta de balanza.
3. Mismo producto otra vez → suma cantidad.
4. Stock: según la política del depósito (block / warn / allow — ver 02 §1.12). En `warn` se agrega
   igual con un aviso amarillo.
5. **Código desconocido** → bip de error y se abre el buscador por nombre. Si el usuario tiene permiso,
   puede asociar el código ahí mismo (la próxima vez ya lo lee). No se crean productos desde la caja.
6. Producto con serie → pide escanear el número de serie.
7. Descuentos por línea o total (con permiso), cambio de cliente (F4: buscar por CUIT en el padrón).
8. **Cobrar** (`F12`): uno o varios medios de pago → se emite el comprobante (ticket no fiscal en F3;
   factura con CAE desde F4) → descuenta stock (`StockMovement sale`) → imprime ticket.
9. Devolución/cambio: escanear el ticket o buscar la venta, escanear lo que vuelve → NC + reingreso.

Objetivo de rendimiento: **escaneo → línea en pantalla en menos de 150 ms**; cobro y factura en menos
de 3 s (sin contar ARCA caído).

## 8. Flujo: conteo físico (F1)

Igual que el ingreso, pero cada escaneo suma a "contado". Al cerrar se compara contra el stock teórico
congelado al empezar y se generan los movimientos `count` de diferencia. Varias personas pueden contar en
paralelo (en distintos celulares) sobre el mismo conteo.

## 9. Etiquetas

- Imprimir etiquetas con código de barras (EAN-13 / Code128), nombre, variante y precio.
- Desde: producto, ingreso de mercadería confirmado, actualización de precios (reimprimir lo que cambió).
- Formatos: hoja A4 de etiquetas autoadhesivas y rollo para impresora de etiquetas (Zebra/Brother vía
  PDF en el tamaño del rollo).

## 10. Tests

- `resolveScan`: EAN-13/8/UPC, dígito verificador, caja con factor, SKU, desconocido, balanza
  (peso y precio).
- Generador de EAN internos (sin colisiones, verificador correcto).
- E2E: ingreso por escaneo con código nuevo → crear rápido → confirmar → stock sube; POS escanear 3
  veces → 1 línea cantidad 3 → cobrar → stock baja.
