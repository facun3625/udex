# 03 — Facturación electrónica ARCA

> Implementación propia (sin intermediarios pagos), módulo `src/modules/fiscal/`. Ver D-04.
> **Antes de implementar cada parte, verificar contra el manual vigente del WSFEv1 y las RG de ARCA**:
> los requisitos cambian (ej. condición IVA del receptor, transparencia fiscal). Lo que dice este doc es la
> guía de diseño, no reemplaza el manual.

## 1. Piezas

| Servicio ARCA | Para qué | Fase |
|---|---|---|
| **WSAA** (autenticación) | Obtener `token` + `sign` firmando un ticket con el certificado | F4 |
| **WSFEv1** (`wsfe`) | Facturas/NC/ND A, B, C, M con CAE (mercado interno) | F4 |
| **Padrón** (`ws_sr_padron_a13` o a5) | Autocompletar razón social, domicilio y condición IVA por CUIT | F4 |
| WSFEX | Factura E (exportación) | Avanzada |
| CAEA | Contingencia (CAE anticipado por quincena) | Avanzada |
| FCE MiPyME | Factura de crédito electrónica (tipos 201+) | Avanzada |

### Endpoints

| | Homologación (pruebas) | Producción |
|---|---|---|
| WSAA | `https://wsaahomo.afip.gov.ar/ws/services/LoginCms` | `https://wsaa.afip.gov.ar/ws/services/LoginCms` |
| WSFEv1 | `https://wswhomo.afip.gov.ar/wsfev1/service.asmx` | `https://servicios1.afip.gov.ar/wsfev1/service.asmx` |

(Verificar URLs al implementar; ARCA mantiene los dominios `afip.gov.ar`.)

## 2. Alta por empresa (lo hace el cliente, guiado por un asistente en Configuración → Facturación)

1. Udex genera **clave privada + CSR** (RSA 2048) para el CUIT. La clave nunca sale del servidor.
2. El cliente sube el CSR en ARCA → *Administración de Certificados Digitales* y descarga el `.crt`.
   (En homologación se usa WSASS.)
3. En *Administrador de Relaciones de Clave Fiscal* asocia el servicio **wsfe** (y padrón) al certificado.
4. Crea un **punto de venta** tipo "Factura Electrónica — Monotributo/Responsable Inscripto — Web Services".
5. Sube el `.crt` a Udex. Udex prueba: WSAA login + `FEParamGetPtosVenta` + `FECompUltimoAutorizado`.

```prisma
model ArcaCredential {
  id String @id @default(cuid())
  companyId      String
  environment    ArcaEnv     // homologation | production
  certPemEnc     String      // cifrado AES-256-GCM
  keyPemEnc      String
  certExpiresAt  DateTime    // alertar 30 días antes
}
model ArcaToken {             // cache de WSAA (dura ~12 h; no pedir uno nuevo por cada factura)
  companyId String; environment ArcaEnv; service String   // "wsfe" | "ws_sr_padron_a13"
  token String; sign String; expiresAt DateTime
  @@id([companyId, environment, service])
}
model FiscalPointOfSale {
  id String @id @default(cuid())
  companyId String; branchId String?
  number    Int         // punto de venta ARCA (ej. 3)
  mode      String      // "wsfe" | "manual" (talonario/controlador, sin CAE online)
}
```

## 3. WSAA (autenticación)

1. Armar el TRA (`loginTicketRequest`): `uniqueId`, `generationTime` (ahora − 10 min),
   `expirationTime` (ahora + 10 min), `service`.
2. Firmarlo como **CMS/PKCS#7 con contenido incluido** usando cert + clave (`node-forge`), base64.
3. `loginCms(in0)` → respuesta con `token`, `sign`, `expirationTime`. Guardar en `ArcaToken`.
4. Si ARCA responde "ya posee un TA válido", reusar el cacheado. Lock por (empresa, servicio) para que dos
   facturas simultáneas no pidan dos tickets.
5. El reloj del servidor debe estar sincronizado (NTP); si no, WSAA rechaza.

## 4. Qué comprobante corresponde

Según condición IVA de **emisor** y **receptor**:

| Emisor | Receptor | Comprobante |
|---|---|---|
| Responsable Inscripto | Responsable Inscripto / Monotributo (*) | **A** (o **M** si ARCA lo exige al emisor) |
| Responsable Inscripto | Consumidor Final / Exento / no categorizado | **B** |
| Monotributo / Exento | cualquiera | **C** |

(*) Verificar la regla vigente para receptores monotributistas al implementar.

Códigos de tipo (`CbteTipo`): 1 FA, 2 NDA, 3 NCA, 6 FB, 7 NDB, 8 NCB, 11 FC, 12 NDC, 13 NCC, 51 FM, 52 NDM,
53 NCM. Se leen y cachean con `FEParamGetTiposCbte`, no se hardcodean como única fuente.

Lógica en `modules/fiscal/voucherType.ts` (función pura + tests con la tabla completa).

## 5. Emisión (`FECAESolicitar`)

Flujo para un `SalesDocument` confirmado:

```
confirmado → fiscal_pending ─(CAE ok)→ authorized ─→ PDF + QR + mail + evento a la tienda
                         └─(rechazo)→ rejected (con observaciones; se corrige y reintenta)
                         └─(timeout)→ queda fiscal_pending → reconciliación (ver §6)
```

1. Tomar lock `pg_advisory_xact_lock(cuit, ptoVta, cbteTipo)`.
2. `FECompUltimoAutorizado` → próximo número = último + 1.
3. Armar el request:
   - `Concepto`: 1 productos, 2 servicios, 3 ambos. Con 2/3: `FchServDesde`, `FchServHasta`, `FchVtoPago`.
   - `DocTipo` / `DocNro`: 80 CUIT, 86 CUIL, 96 DNI, 99 consumidor final sin identificar (DocNro 0). Por
     encima del monto que fije ARCA, consumidor final debe identificarse: monto **configurable**.
   - **`CondicionIVAReceptorId`** (RG 5616): obligatorio. Valores desde `FEParamGetCondicionIvaReceptor`.
   - `ImpTotal = ImpTotConc + ImpNeto + ImpOpEx + ImpIVA + ImpTrib`. En C no se discrimina IVA (`ImpIVA` 0,
     sin array `Iva`).
   - Array `Iva` por alícuota: Id 3 = 0 %, 4 = 10,5 %, 5 = 21 %, 6 = 27 %, 8 = 5 %, 9 = 2,5 %.
   - `Tributos` (percepciones IIBB, impuestos internos) si hay.
   - `MonId` (`PES`, `DOL`) y `MonCotiz` (para USD, cotización de `FEParamGetCotizacion`).
   - NC/ND: `CbtesAsoc` con el comprobante original (tipo, ptoVta, nro, CUIT, fecha).
4. Guardar **request y response XML completos** en `FiscalRequestLog` (soporte y auditoría).
5. Respuesta `A` (aprobado) → guardar CAE y vencimiento. `R` → guardar errores/observaciones. Las
   observaciones (`Obs`) pueden venir aunque se apruebe: mostrarlas.

```prisma
model FiscalDocument {
  id String @id @default(cuid())
  salesDocumentId String @unique
  companyId  String
  environment ArcaEnv
  pointOfSale Int; voucherType Int; voucherNumber Int
  cae         String?; caeExpiresAt DateTime?
  result      String?     // A | R | P
  observations Json?
  qrUrl       String?
  pdfUrl      String?     // en R2
  issuedAt    DateTime?
  @@unique([companyId, environment, pointOfSale, voucherType, voucherNumber])
}
model FiscalRequestLog {
  id String @id @default(cuid())
  companyId String; service String; method String
  requestXml String; responseXml String?; error String?; durationMs Int
  salesDocumentId String?
  createdAt DateTime @default(now())
}
```

## 6. Reconciliación (lo que evita facturas duplicadas o perdidas)

Si `FECAESolicitar` da timeout o error de red, **no se sabe** si ARCA lo autorizó. Nunca reintentar a
ciegas con número nuevo:

1. `FECompUltimoAutorizado`. Si el último == el número que intentamos, `FECompConsultar` ese número y
   comparar importe/doc receptor → si coincide, es nuestro: guardar CAE.
2. Si no llegó, reintentar con el mismo número.
3. Worker que revisa `fiscal_pending` con más de N minutos.

## 7. Comprobante impreso / PDF

Datos obligatorios: emisor (razón social, CUIT, domicilio, condición IVA, IIBB, inicio de actividades),
letra y código, punto de venta-número, fecha, receptor, detalle, subtotales por alícuota (A), total, CAE y
vencimiento, **código QR**.

- **QR** (RG 4892): `https://www.afip.gob.ar/fe/qr/?p=` + base64 de JSON
  `{ver:1, fecha, cuit, ptoVta, tipoCmp, nroCmp, importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut:"E", codAut: CAE}`.
- **Transparencia fiscal** (Ley 27.743 / RG 5614): en comprobantes a consumidor final mostrar el
  **IVA contenido** y otros impuestos nacionales indirectos. Verificar formato vigente.
- Formatos: A4 y ticket 80 mm (para POS con impresora térmica).
- El PDF se genera una vez, se sube a R2 y se manda por mail; la tienda puede mostrar el link al cliente.

## 8. Otras operaciones

- Anular = emitir **nota de crédito** (en ARCA no existe "anular" una factura con CAE).
- Consulta de comprobantes emitidos (`FECompConsultar`) desde el panel.
- Alerta de vencimiento del certificado.
- Libro IVA Ventas / Compras exportable (formato para "Libro IVA Digital") — fase de reportes.

## 9. Pruebas

- Unit: `voucherType`, `totals` (redondeos), armado de XML (snapshots), parser de respuestas (fixtures
  reales guardados de homologación), QR.
- Integración: contra **homologación** con un CUIT de prueba, flag `ARCA_E2E=1` (no corre en CI por
  defecto).
- Nunca se apunta a producción desde tests ni desde desarrollo local.

## 10. Lista de chequeo de salida a producción por cliente

- [ ] Certificado de producción cargado y probado
- [ ] Punto de venta web service creado y asociado
- [ ] Condición IVA de la empresa correcta
- [ ] Factura de prueba de bajo monto emitida y verificada en "Mis comprobantes"
- [ ] Datos impresos revisados por el contador
