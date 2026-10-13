# Instrucciones para agentes de IA (Claude, Codex, Cursor, Gemini, etc.)

Este repo se construye entre varias IAs y una persona. El plan es la fuente de verdad: **no improvises
arquitectura que contradiga `docs/`**. Si algo del plan está mal o falta, cambialo en el doc (y en
`docs/06-decisiones.md` si es una decisión) en el mismo cambio que el código.

## Antes de empezar una tarea

1. Leé [docs/05-roadmap.md](docs/05-roadmap.md) y elegí **una** tarea de la fase activa (la primera con
   tareas sin marcar). No saltees fases salvo que la persona lo pida.
2. Leé el doc del área que vas a tocar (modelo de datos, ARCA, integración...).
3. Leé [docs/07-convenciones.md](docs/07-convenciones.md).

## Mientras trabajás

- Tareas chicas y cerradas: una tarea del roadmap = un cambio revisable (un PR / commit).
- Todo cambio de esquema va con su migración de Prisma (`prisma migrate dev --name ...`). Nunca edites una
  migración ya aplicada.
- Plata y cantidades: **`Decimal`**, nunca `Float`. Ver convenciones.
- Toda tabla de negocio lleva `companyId` y toda consulta filtra por empresa. Ver arquitectura §4.
- Nada fiscal se prueba contra producción de ARCA: solo homologación.
- Lógica de negocio en `src/modules/<modulo>/` con tests en `node --test`; las páginas y server actions
  solo orquestan.

## Al terminar

1. Marcá la tarea como hecha en `docs/05-roadmap.md` (`- [x]`) y agregá una línea al
   [CHANGELOG.md](CHANGELOG.md) con fecha, tarea y qué IA la hizo.
2. Si tomaste una decisión no trivial, registrala en `docs/06-decisiones.md`.
3. Si algo quedó a medias, dejalo escrito debajo de la tarea en el roadmap (`> Pendiente: ...`).
