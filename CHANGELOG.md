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
