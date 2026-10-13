# 05 — Roadmap

Tablero de avance. Marcar `- [x]` al terminar y anotar en [CHANGELOG.md](../CHANGELOG.md).
Cada tarea es un cambio chico y revisable. **Fase activa: F0.**

Orden acordado: fundaciones → **stock** → catálogo → ventas/POS → ARCA → tienda → compras → caja →
reportes → avanzado. (El stock se diseña antes que el catálogo de la tienda — D-03.)

---

## F0 — Fundaciones

- [x] F0.1 Crear proyecto Next 16 + TS + Tailwind 4 + ESLint (mismas versiones que corto). `git init`, repo en GitHub.
- [x] F0.2 Prisma 7 + Postgres (docker-compose para desarrollo), `src/lib/prisma.ts` como corto.
- [x] F0.3 `src/lib/money.ts`: helpers de `Decimal` (sumar, redondear 2 dec, formatear ARS/USD) + tests.
- [x] F0.4 Modelos core: `Company`, `Branch`, `Warehouse`, `User`, `Role`, `Permission`, `UserBranchRole`, `AuditLog`, `Sequence`, `Setting`, `OutboxEvent`.
- [x] F0.5 NextAuth 5 (Credentials), login, selector de empresa/sucursal en la sesión.
- [x] F0.6 Permisos: helper `requirePermission(ctx, "x.y")` + roles semilla. Superadmin con todo, invisible en la lista de usuarios.
- [x] F0.6b Licencia y módulos (`InstallationLicense`, `requireModule`, menú según módulos). Ver arquitectura §5b.
- [x] F0.6c ABM de usuarios (alta, baja, reset de contraseña) y de roles propios; asignar accesos por empresa/sucursal. Superadmin oculto en la lista. Respeta `maxUsers`.
  > Pendiente: `maxCompanies` todavía no se hace cumplir (no hay ABM de empresas desde el panel, solo onboarding por el superadmin). Un usuario solo se gestiona en la empresa activa (sin pantalla para administrar sus accesos en otras empresas).
- [x] F0.7 Layout del panel (sidebar por módulo, buscador global, modo oscuro).
  > Pendiente: la paleta Ctrl+K hoy solo navega; sumar búsqueda de productos/clientes/ventas cuando existan.
- [x] F0.8 Componentes base: tabla con paginación/filtros server-side, formulario, diálogo de confirmación, toasts.
- [ ] F0.9 `src/lib/r2.ts` (Cloudflare R2, igual que corto) + subida de imágenes con thumbnail (sharp).
- [ ] F0.10 Cifrado de secretos (`src/lib/crypto.ts`, AES-256-GCM, clave en `.env`).
- [ ] F0.11 Worker PM2 (`npm run worker`) que procesa `OutboxEvent` con reintentos.
- [ ] F0.12 Infra de tests: `node --test` + e2e con base `<db>_e2e` (copiar el patrón de corto).
- [ ] F0.13 `scripts/deploy.sh`, `.env.example`, guía VPS (basada en `guia_nueva_app.md` de corto).
- [ ] F0.13b `scripts/update-all.sh` (actualizar todas las instalaciones con backup previo) + versión en `/api/health`. Ver arquitectura §5c.
- [x] F0.14 Asistente de alta de empresa: CUIT, razón social, condición IVA, sucursal y depósito inicial, plantilla de rubro.
  > Pendiente: el rubro solo se guarda (Setting); todavía no precarga nada (eso es F2.9). Sin edición de domicilio/Ingresos Brutos desde el panel (llega con F4, ARCA).

## F1 — Núcleo de stock (ver 02 §1)

- [x] F1.1 Modelos `Unit`, `UnitConversion`, `Product`, `Variant` y **`Barcode`** mínimos (los necesarios para tener SKU escaneable).
- [x] F1.1b `modules/catalog/barcode.ts`: `resolveScan` (EAN-13/8/UPC, verificador, factor de caja, SKU, desconocido) + generador de EAN internos + tests. Ver 08 §3.
- [x] F1.1c Componente `ScanInput` (pistola HID, Enter, multiplicador `6*`, bip ok/error, re-foco, suma en la misma línea). Ver 08 §4.
- [x] F1.1d Pantalla **"Probar lector"** (Configuración → Equipos): escanear un código de prueba y detectar falta de Enter, teclado en otro idioma o caracteres raros, con la solución en pantalla. Ver 08 §1b.
- [x] F1.2 `StockMovement` + `StockBalance` + `modules/inventory/post.ts` (registrar movimientos en transacción con advisory lock, actualizar saldo). Tests de concurrencia (e2e real contra Postgres: 25 transacciones en paralelo, sin perder ninguna).
- [x] F1.3 Política de stock negativo (block/warn/allow) por depósito (`Warehouse.negativeStockPolicy`).
  > Pendiente: todavía no hay pantalla para cambiarla (se edita directo en la base); llega con el ABM de
  depósitos. El ingreso de mercadería no la usa (solo suma, nunca puede dejar algo negativo).
- [ ] F1.4 `StockReservation` (crear, consumir, liberar, vencer) + job de vencimiento.
  > No hace falta todavía: no hay ventas (F3) ni checkout web (F5) reservando stock.
- [x] F1.5 Carga inicial de stock (movimiento `initial`) desde pantalla, **por escaneo** y CSV.
- [x] F1.5b **Ingreso de mercadería por escaneo** (`StockReceipt`): depósito, modo "suma 1" / "escanear + cantidad", costo, borrador autoguardado, código desconocido → asociar o crear producto rápido. Ver 08 §6.
- [x] F1.6 Ajustes de stock con motivo y permiso. `/stock/ajustes`, por escaneo con toggle suma/resta, respeta la política de stock negativo del depósito.
- [ ] F1.7 Transferencias entre depósitos (draft → sent → received).
- [ ] F1.8 Conteo físico por escaneo (pistola o cámara del celular, varios contadores en paralelo). Ver 08 §8.
- [x] F1.9 Kardex (historial de movimientos) por producto, en `/productos/[id]/movimientos`.
  > Pendiente: pantalla de existencias consolidadas por depósito (hoy el stock por depósito solo se ve dentro de cada producto).
- [ ] F1.10 `VariantCost`: costo promedio ponderado.
- [ ] F1.11 `inventory:verify` (recalcular saldos desde el ledger y alertar diferencias).
- [ ] F1.12 Mínimos/máximos y alerta de faltantes.

## F2 — Catálogo universal (ver 02 §2)

- [x] F2.3b Primer corte de `Category` (árbol con `parentId`, sin SEO/imagen/orden todavía) y un ABM de
  producto mínimo: `/productos` (listado con precio/categoría/estado, marca "Falta completar" si no
  tiene precio) y `/productos/[id]` (nombre, descripción, categoría con alta rápida desde un diálogo,
  IVA, estado, SKU, precio/precio de lista/costo, códigos de barras). `/productos/nuevo` para el alta
  manual (la otra puerta es escanear un código desconocido al recibir mercadería, F1.5b).
  > D-16: el precio quedó plano en `Variant.price` (+ `compareAtPrice`/`costPrice`), no el sistema de
  listas de precios de este documento — ver docs/06-decisiones.md. `Brand`/`Tag` y SEO de categoría
  quedan pendientes de F2.3/F2.9.
- [ ] F2.1 `Attribute`, `AttributeOption` (tipos: text, number, select, multiselect, color, boolean, date).
- [ ] F2.2 `ProductTemplate` + `TemplateAttribute` (descriptivo / eje de variante).
- [ ] F2.3 Completar `Category` (SEO, imagen, orden) + `Brand`, `Tag`.
- [ ] F2.4 Completar el ABM de producto: tipo, plantilla, atributos, controles (stock/lote/serie), imágenes R2.
- [ ] F2.5 Generador de variantes por ejes + patrón de SKU.
- [ ] F2.6 Gestión de códigos en el ABM (varios por variante, caja con factor, aviso de duplicado) + impresión de etiquetas A4 y rollo. Ver 08 §9.
- [ ] F2.6b Etiquetas de balanza (`ScaleBarcodeFormat`, peso/precio variable). Ver 08 §5.
- [ ] F2.7 Listas de precios (reemplaza el precio plano de D-16: base, derivadas por %, redondeo, escalas por cantidad) + actualización masiva.
- [ ] F2.8 Importación / exportación CSV de productos y variantes.
- [ ] F2.9 Plantillas de rubro (`seed/rubros/*.json`): indumentaria, ferretería, almacén, electrónica, farmacia, librería, autopartes, servicios.
- [ ] F2.10 Kits/combos (`KitComponent`) y su efecto en stock.
- [ ] F2.11 Lotes + vencimientos; números de serie.

## F3 — Clientes, ventas y punto de venta (sin fiscal todavía)

- [ ] F3.1 `Customer` (doc, condición IVA, lista de precios, domicilios).
- [ ] F3.2 `modules/sales/totals.ts` (cálculo de líneas, descuentos, IVA por alícuota, redondeos) + tests exhaustivos.
- [ ] F3.3 `SalesDocument` + líneas: presupuesto, pedido, remito. Conversión entre documentos.
- [ ] F3.4 Reglas de stock: pedido reserva, remito/entrega descuenta, devolución reingresa.
- [ ] F3.5 **POS (caja) por escaneo**: `ScanInput`, re-escaneo suma cantidad, multiplicador, balanza, desconocido → buscador (+ asociar código con permiso), política de stock, cache de códigos en el navegador, < 150 ms por escaneo. Ver 08 §7.
- [ ] F3.5b POS: cobro con varios medios de pago (`F12`), descuentos con permiso, devolución/cambio escaneando.
- [ ] F3.6 PDF de documentos (A4 y ticket 80 mm) subidos a R2 + envío por mail.

## F4 — Facturación electrónica ARCA (ver 03)

- [ ] F4.1 Generar clave + CSR; subir certificado; `ArcaCredential` cifrada; alerta de vencimiento.
- [ ] F4.2 WSAA: TRA, firma CMS (`node-forge`), `loginCms`, cache `ArcaToken` con lock.
- [ ] F4.3 Cliente SOAP WSFEv1 + `FiscalRequestLog`; métodos `FEDummy`, `FEParamGet*` (tipos cbte, IVA, condición IVA receptor, monedas, ptos venta, cotización).
- [ ] F4.4 `voucherType.ts` (qué letra corresponde) + tests.
- [ ] F4.5 `FECAESolicitar` para Factura A/B/C (productos, servicios, ambos), multimoneda.
- [ ] F4.6 Notas de crédito/débito con comprobante asociado.
- [ ] F4.7 Reconciliación por timeout (`FECompUltimoAutorizado` + `FECompConsultar`) + worker de pendientes.
- [ ] F4.8 QR + PDF fiscal (A4 y ticket) con transparencia fiscal.
- [ ] F4.9 Padrón: autocompletar cliente por CUIT.
- [ ] F4.10 Asistente de configuración (pasos del alta en ARCA) + prueba de conexión.
- [ ] F4.11 Facturar desde POS en un paso. E2E completo en homologación.

## F5 — Integración con la tienda (ver 04)

- [ ] F5.1 `Channel`, `ChannelWarehouse`, `ChannelListing`, `ApiKey`.
- [ ] F5.2 API `/api/v1` (catálogo, stock, reservas, pedidos, clientes, factura) + firmas HMAC.
- [ ] F5.3 Webhooks salientes desde el outbox.
- [ ] F5.4 Pantalla "Publicar en tienda" (por producto y masivo; overrides de título/descr./SEO).
- [ ] F5.5 Facturación automática de pedidos web (`on_paid` / `on_shipped`).
- [ ] F5.6 Importador corto → Udex (categorías, atributos, productos, variantes, imágenes, stock, clientes).
- [ ] F5.7 **En corto**: `ERP_MODE`, ids externos, cliente `src/lib/erp/`, webhook receptor, pull incremental.
- [ ] F5.8 **En corto**: checkout con reserva en Udex + fallback; campos de factura A.
- [ ] F5.9 **En corto**: panel en solo lectura para catálogo en modo udex; factura en pedido, mail y "Mi cuenta".
- [ ] F5.10 E2E: compra web → reserva → pedido → factura B homologación → PDF en la tienda.

## F6 — Compras y proveedores

- [ ] F6.1 `Supplier`, `SupplierProduct` (código y costo del proveedor).
- [ ] F6.2 Orden de compra + sugerencia por faltantes.
- [ ] F6.3 Recepción contra orden de compra **usando la misma pantalla de escaneo de F1.5b** (total/parcial, diferencias vs. lo pedido) → stock + CPP.
- [ ] F6.4 Factura de proveedor (tipo, nº, CAE, percepciones) → cuenta corriente y libro IVA compras.
- [ ] F6.5 Actualización de precios de venta desde lista de costos del proveedor (CSV).

## F7 — Caja, cobranzas y cuentas corrientes

- [ ] F7.1 `PaymentMethod` (recargos, cuotas), `CashRegister`, `CashSession` (apertura, cierre, arqueo).
- [ ] F7.2 `AccountEntry`: cuenta corriente de clientes y proveedores, límite de crédito.
- [ ] F7.3 Recibos de cobro y órdenes de pago con imputación.
- [ ] F7.4 Cartera de cheques.
- [ ] F7.5 Movimientos de caja (ingresos/egresos varios) y transferencias entre cajas.

## F8 — Reportes y exportaciones

- [ ] F8.1 Tablero: ventas del día/mes, por canal, sucursal, vendedor; margen.
- [ ] F8.2 Stock valorizado, rotación, sin movimiento, por vencer.
- [ ] F8.3 Libro IVA ventas/compras + exportación para Libro IVA Digital.
- [ ] F8.4 Ranking de productos, clientes; exportación CSV/Excel de todo listado.

## Transversal (se va completando en cada fase)

- [ ] Manual de usuario final por módulo (`docs/manual/`), con capturas, como el de corto.
- [ ] `docs/hardware.md`: lectores, impresoras de tickets y etiquetas y balanzas recomendados para clientes.
- [ ] Ayuda contextual en cada pantalla ("¿Qué es esto?") y estados vacíos que explican qué hacer.

## F9 — Avanzado

- [ ] CAEA (contingencia) · WSFEX (exportación) · FCE MiPyME
- [ ] Percepciones/retenciones IIBB por padrón
- [ ] Producción simple (recetas / ordenes de armado)
- [ ] Multimoneda con cotización diaria y precios en USD
- [ ] Promociones (2x1, % en segunda unidad) compartidas con la tienda
- [ ] Más canales: Mercado Libre, Tiendanube
- [ ] App móvil/PWA para depósito (conteo y recepciones con la cámara)
- [ ] Asistente de IA para consultas ("¿qué me conviene reponer?")
