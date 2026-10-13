# 00 — Visión

## Qué es Udex

Un ERP para pymes argentinas de **cualquier rubro**, que resuelve en un solo sistema:

- **Catálogo** flexible: productos simples, con variantes (talle × color, medida × material...), servicios,
  combos/kits, venta por unidad, peso, metro o litro.
- **Todo por código de barras**: ingreso de mercadería, venta por caja y conteo se hacen con la pistola
  (o la cámara del celular). Si el código ya está guardado, se escanea y se pone la cantidad.
- **Inventario** por depósito/sucursal, con historial de movimientos auditable (y opcionalmente lotes,
  vencimientos y números de serie).
- **Ventas**: presupuesto → pedido → remito → factura, y punto de venta (mostrador) rápido.
- **Facturación electrónica ARCA** (ex AFIP): facturas A/B/C/M, notas de crédito y débito, CAE, QR.
- **Compras y proveedores**, **clientes y cuentas corrientes**, **caja y cobranzas**.
- **Integración nativa con el ecommerce propio** (corto): el ERP es el dueño del catálogo, precios y stock;
  la tienda es un canal de venta más; los pedidos web entran al ERP y se facturan solos.

## "Para todos los rubros" significa

No hardcodear nada de un rubro. En vez de campos fijos como `talle` o `color`, el sistema tiene:

1. **Atributos definibles** por la empresa (tipo texto, número, lista, color, sí/no, fecha).
2. **Plantillas de producto** (conjuntos de atributos) asociables a categorías: "Remera" trae Talle y Color;
   "Tornillo" trae Diámetro, Largo y Material; "Vino" trae Varietal, Bodega, Cosecha.
3. **Ejes de variante**: cualquier atributo de lista puede generar variantes (cada combinación es un SKU con
   su stock, precio y código de barras).
4. **Unidades de medida** con decimales (vender 0,350 kg o 2,5 m) y conversiones (caja de 12 → unidad).
5. **Controles opcionales por producto**: lote + vencimiento (alimentos, farmacia), número de serie
   (electrónica), sin control de stock (servicios).
6. **Plantillas de rubro** al dar de alta una empresa: precargan atributos, plantillas, unidades y categorías
   típicas (indumentaria, ferretería, almacén, etc.). Son solo datos semilla, no lógica especial.

## Modelo de negocio

Udex es un **producto que se vende** a negocios: el desarrollador lo instala y mantiene (una instalación
por cliente, D-01) y los empleados del cliente lo usan todos los días. Por eso:

- El desarrollador es **superadmin** en cada instalación (soporte, alta de administradores, módulos);
  no aparece en la lista de usuarios del cliente (como en corto).
- Los **módulos se habilitan por cliente** (licencia): se pueden armar planes.
- Todo tiene que poder configurarlo el cliente solo, con asistentes y textos claros, sin pedir cambios
  de código. Cada consulta de soporte evitada es plata.
- El hardware (lectores, impresoras, balanzas) lo compra el cliente: Udex tiene que funcionar con
  equipos genéricos y traer una pantalla de diagnóstico.

## Usuarios

- **Superadmin (desarrollador / soporte)**: instala, habilita módulos, da soporte. Invisible para el cliente.
- **Dueño / administrador**: configura todo, ve reportes.
- **Vendedor / cajero**: punto de venta, presupuestos, cobranzas.
- **Depósito**: recepciones, transferencias, conteos.
- **Contador** (solo lectura + exportaciones): libros IVA, comprobantes.

## Fuera de alcance (por ahora)

- Contabilidad completa (asientos, balance). Se exportan datos al contador.
- Sueldos y RRHH.
- Producción / manufactura con órdenes de fabricación (queda como fase avanzada: recetas simples).
- Exportación (WSFEX) y factura de crédito electrónica MiPyME: fase avanzada.

## Criterios de éxito del MVP

1. Una empresa de indumentaria y una de ferretería pueden cargar su catálogo sin ningún cambio de código.
2. Llega mercadería: se escanea cada producto, se pone la cantidad y el stock queda actualizado.
   Códigos nuevos se dan de alta en el momento sin salir de la pantalla.
3. En la caja se escanea, se cobra y se emite una factura B con CAE en menos de 30 segundos.
4. Una venta en la tienda online descuenta stock en el ERP y genera su factura automáticamente.
