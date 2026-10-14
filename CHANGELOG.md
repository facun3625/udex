# Registro de avance

Una línea por tarea terminada: `AAAA-MM-DD · F<fase>.<n> · descripción · quién (persona / IA)`.

- 2026-10-13 · F0 · Plan inicial documentado en `docs/` · Claude
- 2026-10-13 · F0 · Agregado diseño de códigos de barras (doc 08, D-14, tareas F1/F2/F3/F6) · Claude
- 2026-10-13 · F0 · Udex como producto para revender (D-15): superadmin, licencia/módulos, diagnóstico de lector, update-all · Claude
- 2026-10-13 · F0.1 · Proyecto Next 16 + TS + Tailwind 4 + ESLint, repo facun3625/udex · Claude
- 2026-10-13 · F0.2 · Prisma 7 + Postgres en docker-compose (puerto 5460), `/api/health` · Claude
- 2026-10-13 · F0.3 · `src/lib/money.ts` (Decimal, redondeo, formato y parseo es-AR) + tests · Claude
- 2026-10-13 · F0.4 · Modelos core (Company, Branch, Warehouse, User, Role, Membership, InstallationLicense, AuditLog, Sequence, Setting, OutboxEvent) · Claude
- 2026-10-13 · F0.5 · Login NextAuth 5 (Credentials, freno de intentos), elección de empresa/sucursal, proxy de rutas · Claude
- 2026-10-13 · F0.6 · Catálogo de permisos, roles de sistema, `requireContext`/`requirePermission`, superadmin por consola · Claude
- 2026-10-13 · F0.6b · Licencia y módulos (`requireModule`, `requireWritable`, menú filtrado, pantalla del superadmin) · Claude
- 2026-10-13 · F0.7 · Panel: menú agrupado con íconos, cajón en celular, empresa/sucursal en el encabezado, modo oscuro, paleta Ctrl+K · Claude
- 2026-10-13 · F0.14 · Asistente de alta de empresa (`/onboarding`, solo superadmin): CUIT validado, sucursal y depósito por defecto, rubro · Claude
- 2026-10-13 · F0.6c · Usuarios y roles: alta/baja, múltiples accesos por sucursal, contraseña generada (se muestra una vez), roles propios con permisos, límites de licencia, autoprotección contra autobloqueo · Claude
- 2026-10-13 · F0.8 · Kit UI (tokens de color, Button, Field, DecimalInput, Card, Badge, Alert, DataTable, filtros por URL, toasts, confirmación) + pantalla de Auditoría · Claude
- 2026-10-13 · F1 · Stock con código de barras, de punta a punta (modelo, lógica y pantallas):
  Unit/Product/Variant/Barcode; resolveScan con EAN-13/EAN-8/UPC-A (dígito verificador GS1), generador
  de EAN interno y detector de lector mal configurado; StockMovement/StockBalance con
  pg_advisory_xact_lock (25 transacciones concurrentes sin perder ninguna, probado contra Postgres real);
  política de stock negativo por depósito; ScanInput (pistola/teclado, multiplicador "6*", bip);
  ingreso de mercadería por escaneo con alta rápida de producto desde un código desconocido; pantalla
  "Probar lector"; infraestructura de tests e2e (tests/e2e/run.cjs, base `_e2e` descartable) · Claude
- 2026-10-13 · F1.6 y F1.9 · Ajustes de stock (StockAdjustment, motivo obligatorio, escaneo con toggle
  suma/resta, respeta la política de stock negativo del depósito) y kardex por producto
  (/productos/[id]/movimientos). Probado con navegador: ajuste positivo y negativo sobre dos
  productos, bloqueo correcto al intentar restar más stock del disponible (el ajuste queda en
  borrador, sin movimiento creado) · Claude
- 2026-10-13 · F1.7 y F1.8 · Transferencias entre depósitos (enviar descuenta el origen, recibir con
  cantidad editable por línea y aviso de diferencia) y conteos físicos (incremento atómico por escaneo,
  pensado para varios contadores a la vez, solo ajusta lo escaneado). Verificado con un e2e de 40
  escrituras concurrentes reales y con dos sesiones de navegador contando el mismo producto a la vez
  (4+3=7 exacto). Con esto F1 (stock con código de barras) queda completo salvo el costo promedio
  ponderado (F1.10) · Claude
- 2026-10-14 · F2.1 (completo) · ABM de atributos terminado: editar nombre/tipo (con confirmación si
  se pierden las opciones), editar/renombrar una opción, eliminar atributo y eliminar opción — ambos
  con el motivo explicado cuando están en uso (asignado a un producto / usado por una variante), en vez
  de fallar en silencio. Bug real encontrado y corregido: `useToast`/`useConfirm` devolvían un objeto
  nuevo en cada render de `FeedbackProvider`, así que un efecto que reacciona a un error de un server
  action con `toast.error(...)` entraba en bucle (cada toast nuevo re-renderizaba el provider → el
  efecto se disparaba de nuevo → otro toast...): un clic mostró el mismo aviso 14 veces. Se arregló
  memoizando ese objeto; quedó documentado en docs/07-convenciones.md · Claude
- 2026-10-14 · F2.1 y F2.5 · Atributos y variantes: Attribute/AttributeOption (select y color, con
  swatch), asignación de ejes por producto (D-17: sin plantillas todavía), generador de variantes
  (producto cartesiano + SKU sugerido + no duplica lo ya generado), ficha propia por variante
  (precio/SKU/códigos de barra), listado de productos corregido para mostrar rango de precio y cantidad
  de variantes en vez de buscar una variante "default" que un producto variable no tiene. Probado de
  punta a punta: Talle×Color generó 4 variantes, una variante editada individualmente (precio + código
  de barras), y un ingreso de mercadería escaneando el código de esa variante encontró exactamente esa
  combinación entre las demás del mismo producto · Claude
- 2026-10-14 · Marca · Logo real (docs/udex.svg) aplicado a toda la app: tipografía Montserrat
  (next/font/google con weight "variable" — la lista de pesos sueltos rompía el build con Turbopack
  en esta versión de Next), azul de marca #017cfa como color de acento (reemplaza el verde petróleo),
  Wordmark/BrandMark recortados del logo original con negro/blanco invertido por tema, favicon nuevo · Claude
- 2026-10-13 · F2.3b · Primer corte de Productos: Category (árbol), precio plano en Variant (D-16),
  listado /productos, alta manual /productos/nuevo, edición completa /productos/[id] (categoría con
  alta rápida en diálogo, precio, SKU, códigos de barras). Corregidos dos bugs reales encontrados
  probando con navegador: un <form> anidado dentro de otro que rompía el alta de categoría, y un
  Decimal de Prisma pasado sin convertir a un componente cliente · Claude
- 2026-10-14 · F2.1 · Alta de atributos "pro": para tipo color, picker nativo con gotero/hex por
  opción en vez de escribir el código a mano, más paleta de colores comunes de un clic; para tipo
  lista, botones de plantillas de talles estándar argentinos (ropa, calzado adulto/niño, niños por
  edad, bebés, pantalón por cintura) que cargan las opciones de un clic. Bug real encontrado
  probando con navegador: el placeholder del textarea de opciones se mostraba como el texto literal
  "S\nM\nL" en vez de tres líneas, por usar `placeholder="..."` (string JSX plano, no interpreta
  `\n`) en lugar de `placeholder={"..."}` (expresión JS) · Claude
