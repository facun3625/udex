# Udex — ERP multirubro

ERP pensado para cualquier rubro (indumentaria, ferretería, alimentos, electrónica, servicios, etc.), con
catálogo flexible (atributos, variantes, unidades de medida), inventario multidepósito, ventas, compras,
caja, **facturación electrónica con ARCA** e **integración nativa con el ecommerce existente**
([facun3625/corto](https://github.com/facun3625/corto)).

> **Estado:** planificación. Todavía no hay código. El plan está en [`docs/`](docs/).

## Stack (el mismo de todas las apps)

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + PostgreSQL · NextAuth 5 · Tailwind 4 ·
Cloudflare R2 · deploy en VPS (PM2 + Nginx + Postgres en Docker).

## Desarrollo

```bash
cp .env.example .env     # en desarrollo ya apunta al Postgres de docker-compose
npm install
npm run db:up            # Postgres 16 en localhost:5460
npm run dev              # http://localhost:3000 · salud: /api/health
npm test                 # tests de unidad (node --test)
```

## Cómo leer el plan

| Doc | Qué tiene |
|---|---|
| [docs/00-vision.md](docs/00-vision.md) | Qué es Udex, para quién, alcance y lo que NO es |
| [docs/01-arquitectura.md](docs/01-arquitectura.md) | Stack, estructura de carpetas, módulos, multiempresa, seguridad |
| [docs/02-modelo-de-datos.md](docs/02-modelo-de-datos.md) | Modelo de datos: catálogo universal, stock, comprobantes, cuentas |
| [docs/03-facturacion-arca.md](docs/03-facturacion-arca.md) | Facturación electrónica: WSAA, WSFEv1, CAE, QR, homologación |
| [docs/04-integracion-ecommerce.md](docs/04-integracion-ecommerce.md) | Cómo se conecta con la tienda (catálogo, stock, pedidos, facturas) |
| [docs/05-roadmap.md](docs/05-roadmap.md) | **Fases y tareas con checkboxes — el tablero de avance** |
| [docs/06-decisiones.md](docs/06-decisiones.md) | Decisiones tomadas (ADR) y decisiones pendientes |
| [docs/07-convenciones.md](docs/07-convenciones.md) | Reglas de código, tests, migraciones, commits |
| [docs/08-codigos-de-barras.md](docs/08-codigos-de-barras.md) | Escaneo: ingreso de mercadería, caja, conteo, balanza, etiquetas |

**Si sos una IA trabajando en este repo, empezá por [AGENTS.md](AGENTS.md).**
