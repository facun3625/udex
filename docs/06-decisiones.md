# 06 — Decisiones

Formato: **ID · Título** — Estado (Aceptada / Propuesta / Pendiente) — Decisión — Por qué.
Una IA puede proponer; solo la persona da por **Aceptada** una decisión Propuesta o Pendiente.

## Tomadas

**D-00 · Stack** — Aceptada — Next.js 16 + React 19 + Prisma 7 + PostgreSQL + NextAuth 5 + Tailwind 4,
imágenes en Cloudflare R2, deploy en VPS con PM2/Nginx/Docker. — Es el stack de todas las apps; se reusa
código, scripts y experiencia de corto.

**D-03 · Primero el stock; la tienda se adapta al ERP** — Aceptada — Se diseña primero el núcleo de stock,
después el catálogo, y la tienda (corto) se modifica para seguir el modelo de Udex. — El ERP es la fuente
de verdad; adaptar la tienda (que es modificable) evita traducciones frágiles.

**D-14 · El escaneo de códigos de barras es el modo principal de operar stock y caja** — Aceptada —
Un único motor (`resolveScan` + `ScanInput`) para ingreso, caja y conteo; `Barcode` nace con `Variant` en
F1. Lectores tipo pistola en modo teclado (sin drivers) + cámara del celular. — Pedido explícito: llega la
mercadería, se escanea y se pone la cantidad; lo mismo para vender. Ver 08.

**D-01 · Una instalación por cliente, multiempresa adentro** — Aceptada (2026-10-13) — Cada cliente tiene su
instancia y base (como hoy las tiendas); dentro, varias empresas (CUIT) y sucursales. Todo con `companyId`.
— Coincide con cómo se despliega todo hoy; aislamiento total entre clientes. Si en el futuro se quiere
SaaS compartido, el `companyId` ya está y se agrega un nivel `Tenant`.

**D-15 · Udex es un producto para revender** — Aceptada (2026-10-13) — El desarrollador vende e instala
Udex; los usuarios finales son los empleados de cada cliente. Superadmin invisible, módulos habilitables
por licencia, pantallas de diagnóstico de hardware, manual de usuario y actualización masiva de
instalaciones. — Lo indicó la persona: "vendo el sistema, luego las personas usarán el sistema".

## Propuestas (con recomendación, falta confirmar)

**D-02 · Catálogo compartido entre empresas de una instalación** — Propuesta — Productos compartidos;
stock, precios por lista y comprobantes por empresa. — Un dueño con dos CUIT vende los mismos productos.

**D-04 · ARCA con implementación propia** — Propuesta — WSAA/WSFEv1 propios (fetch + xml2js +
node-forge), sin servicios pagos tipo AfipSDK. — Sin costo por comprobante ni dependencia externa. Plan B
si se traba: usar un SDK y encapsularlo detrás de la misma interfaz `modules/fiscal`.

**D-05 · Valorización por costo promedio ponderado** — Propuesta — CPP al inicio; FIFO después si algún
rubro lo pide. — Es lo más usado en pymes y lo más simple de mantener.

**D-06 · Todo producto tiene variante** — Propuesta — Producto simple = una variante por defecto. —
Un solo camino para stock, precio y líneas de venta.

**D-08 · Bases separadas ERP / tienda, sync por API + webhooks + pull** — Propuesta — Ver 04. — La tienda
sigue vendiendo si el ERP cae; cada sistema se despliega por separado.

**D-09 · Reserva de stock sincrónica en el checkout web con fallback local** — Propuesta — Ver 04 §4–5. —
Evita sobreventa entre mostrador y web sin frenar la tienda si el ERP no responde.

## Pendientes (preguntar a la persona)

**D-07 · Generación de PDF** — `@react-pdf/renderer` (liviano, sin navegador) vs HTML→PDF con Playwright
(más fácil de diseñar). Recomendación: `@react-pdf/renderer`.

**D-10 · Cliente piloto** — ¿Qué negocio real se usa para validar el MVP (y de qué rubro)?

**D-11 · Nombre y dominio** — "Udex" confirmado como nombre del producto? Dominio para instalaciones.

**D-12 · Impresión en POS** — ¿Impresoras térmicas 80 mm vía navegador (PDF/ventana de impresión) o hace
falta un agente local (ESC/POS, cajón de dinero)?

**D-13 · Facturación de pedidos web** — Default `on_paid` u `on_shipped`.
