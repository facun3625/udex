// Importes y cantidades del ERP. Todo cálculo de plata o de stock pasa por acá: nunca se usa `number`
// para sumar precios ni cantidades (0.1 + 0.2 !== 0.3). Ver docs/07-convenciones.md.
//
// Módulo puro (sin dependencias de servidor): lo usan los módulos de negocio, los server actions y
// también la UI (POS, formularios). Los `Decimal` de Prisma se aceptan como entrada: son decimal.js.
import DecimalJs from "decimal.js";

// Clon propio para no depender de la configuración global de decimal.js (Prisma usa la suya).
// ROUND_HALF_UP: el redondeo "de toda la vida" que esperan el contador y ARCA (2,345 → 2,35).
export const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

// Lo que se acepta como entrada. `number` solo para literales del código (dec(21), dec(0)); los
// valores que vienen del usuario o de la base llegan como string o Decimal.
export type DecimalInput = Decimal | DecimalJs | string | number | { toString(): string };

export type CurrencyCode = "ARS" | "USD";

export const MONEY_DECIMALS = 2;

export function dec(value: DecimalInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError(`Importe inválido: ${value}`);
    return new Decimal(value);
  }
  // Decimal de Prisma u otro clon de decimal.js: se pasa por string para no mezclar configuraciones.
  return new Decimal(value.toString());
}

export function sum(values: Iterable<DecimalInput>): Decimal {
  let total = new Decimal(0);
  for (const v of values) total = total.plus(dec(v));
  return total;
}

// Redondeo de importes a centavos. Es el único punto donde se redondea plata (líneas, alícuotas,
// totales); los cálculos intermedios van con precisión completa.
export function roundMoney(value: DecimalInput): Decimal {
  return dec(value).toDecimalPlaces(MONEY_DECIMALS, Decimal.ROUND_HALF_UP);
}

// Redondeo de cantidades según la unidad (Unit.decimals: 0 para unidades, 3 para kg...).
export function roundQty(value: DecimalInput, decimals: number): Decimal {
  return dec(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

// `pct` en porcentaje (21 = 21 %). Sin redondear: el que llama decide cuándo redondear.
export function percentOf(amount: DecimalInput, pct: DecimalInput): Decimal {
  return dec(amount).times(dec(pct)).dividedBy(100);
}

export function isZero(value: DecimalInput): boolean {
  return dec(value).isZero();
}

// Separa miles con "." y decimales con "," (formato es-AR) sin pasar por `number`, para no perder
// precisión en importes grandes.
function groupEsAr(fixed: string): string {
  const negative = fixed.startsWith("-");
  const [int, frac] = (negative ? fixed.slice(1) : fixed).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (negative ? "-" : "") + (frac !== undefined ? `${grouped},${frac}` : grouped);
}

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { ARS: "$", USD: "US$" };

// "$ 1.234,56" · "US$ 1.234,56" · "-$ 10,00"
export function formatMoney(value: DecimalInput, currency: CurrencyCode = "ARS"): string {
  const rounded = roundMoney(value);
  const negative = rounded.isNegative() && !rounded.isZero();
  const body = groupEsAr(rounded.abs().toFixed(MONEY_DECIMALS));
  return `${negative ? "-" : ""}${CURRENCY_SYMBOL[currency]} ${body}`;
}

// "1.250" (unidades) · "0,350" (kg con 3 decimales)
export function formatQty(value: DecimalInput, decimals: number): string {
  const rounded = roundQty(value, decimals);
  return groupEsAr((rounded.isZero() ? rounded.abs() : rounded).toFixed(decimals));
}

// Lo que tipea una persona en un formulario o en la caja. Acepta formato argentino ("1.234,56",
// "0,350") y también punto decimal ("1234.56", "0.350"). Devuelve null si no es un número.
//
// Regla para el caso ambiguo: si hay coma, la coma es el decimal y los puntos son miles. Si solo hay
// puntos y todos los grupos tienen 3 dígitos ("1.250", "12.500.000") son miles, porque así se escriben
// los números en Argentina; si no ("12.5", "0.350", "1.25") el punto es decimal. Para cargar 1,250 kg
// hay que usar coma.
export function parseDecimalInput(raw: string): Decimal | null {
  let s = raw.trim().replace(/\s/g, "").replace(/^\$|^US\$/i, "");
  if (s === "") return null;
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);

  if (s.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null;
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    const thousands = parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && /^[1-9]\d{0,2}$/.test(parts[0]);
    if (thousands) s = parts.join("");
    else if (!/^\d*\.\d+$/.test(s)) return null;
  } else if (!/^\d+$/.test(s)) {
    return null;
  }

  const value = new Decimal(s);
  return negative ? value.negated() : value;
}
