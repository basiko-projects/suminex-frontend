import { ServiceTariff, ServiceTariffProduct, EnergyPeriodDto } from '../../core/models/service.model';
import { LuzOcrResult, OcrEnergiaPeriodo, OcrPotenciaPeriodo } from '../../core/models/comparison.model';
import { ComparadorFormValue, ComparatorResult, PeriodoResultado, Period, TaxRates } from '../../core/models/comparator.models';

/** Impuesto Eléctrico español (tipo legal general). Puede bajar por decreto temporal — pásalo vía `rates`, no lo redespliegues. */
export const IE_RATE = 0.0511269632;
/** IVA general. Puede bajar a 0.10 temporalmente para potencias <=10kW — pásalo vía `rates`, no lo redespliegues. */
export const IVA_RATE = 0.21;

export const ALL_PERIODS: Period[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}
const round6 = (v: number) => round(v, 6);
const round3 = (v: number) => round(v, 3);
const round2 = (v: number) => round(v, 2);

function atrMultiplier(tariffCode: string | null | undefined): number {
  return (tariffCode ?? '').startsWith('6.') ? 1.07 : 1.15;
}

/** Entre varias entradas con vigencia, elige la vigente en `date`; si ninguna coincide, cae a isActive, y si tampoco, a la primera. */
function pickActiveByDate<T extends { validFrom: string; validUntil?: string | null; isActive?: boolean }>(
  list: T[] | undefined | null,
  date: string,
): T | undefined {
  if (!list?.length) return undefined;
  const inRange = list.filter(x => x.validFrom <= date && (!x.validUntil || x.validUntil >= date));
  if (inRange.length) return inRange.reduce((a, b) => (a.validFrom > b.validFrom ? a : b));
  return list.find(x => x.isActive) ?? list[0];
}

function findProduct(products: ServiceTariffProduct[] | undefined, name: string): ServiceTariffProduct | undefined {
  return products?.find(p => p.name === name);
}

function baseModalidad(producto: string): string {
  return producto === 'Index Coste' || producto === 'Index Promo' ? 'Index Base' : producto;
}

function omieMarginFor(producto: string): number {
  if (producto === 'Index Base') return 5;
  if (producto === 'Index Promo') return 8;
  return 0;
}

function findEnergyPeriod(product: ServiceTariffProduct | undefined, period: Period): EnergyPeriodDto | undefined {
  return product?.energyPeriods?.find(e => e.period === period);
}

function isFixed(product: ServiceTariffProduct | undefined): boolean {
  return (product?.type ?? '').toUpperCase() === 'FIXED';
}

/** priceKwh para productos Fixed, baseValue (componente base indexado) para Indexed. */
function valorTarifaEnergia(product: ServiceTariffProduct | undefined, period: Period): number {
  const ep = findEnergyPeriod(product, period);
  if (!ep) return 0;
  return isFixed(product) ? (ep.priceKwh ?? 0) : (ep.baseValue ?? 0);
}

function potenciaBase(product: ServiceTariffProduct | undefined, period: Period, tariff: ServiceTariff, fecha: string): number {
  const own = product?.powerPeriods?.find(p => p.period === period)?.priceKwDay;
  if (own != null) return own;
  const candidates = (tariff.boePeriods ?? []).filter(b => b.period === period);
  return pickActiveByDate(candidates, fecha)?.priceKwDay ?? 0;
}

function repartoOmie(tariff: ServiceTariff, period: Period, fecha: string): number {
  const dist = pickActiveByDate(tariff.omieDistributions, fecha);
  return dist?.periods?.find(p => p.period === period)?.factor ?? 0;
}

export function computeComparison(
  tariff: ServiceTariff,
  form: ComparadorFormValue,
  ocr: LuzOcrResult,
  rates: TaxRates = { ieRate: IE_RATE, ivaRate: IVA_RATE },
): ComparatorResult {
  const fecha = ocr.fechaDesde;
  const diasFactura = Math.max(1, ocr.diasFacturacion || 1);

  const productoSeleccionado = findProduct(tariff.products, form.producto);
  const tipoProducto: 'Fixed' | 'Indexed' = isFixed(productoSeleccionado) ? 'Fixed' : 'Indexed';
  const productoBase = findProduct(tariff.products, baseModalidad(form.producto));
  const omieMargin = omieMarginFor(form.producto);
  const atr = atrMultiplier(tariff.code);

  const energiaPorPeriodo = new Map<Period, OcrEnergiaPeriodo>((ocr.energia ?? []).map(e => [`P${e.p}` as Period, e]));
  const potenciaPorPeriodo = new Map<Period, OcrPotenciaPeriodo>((ocr.potencia ?? []).map(p => [`P${p.p}` as Period, p]));

  const periodos: PeriodoResultado[] = [];
  let totalEnergiaOferta = 0;
  let totalPotenciaOferta = 0;

  ALL_PERIODS.forEach((periodo) => {
    const kwh = energiaPorPeriodo.get(periodo)?.activa?.kwh ?? 0;
    const kw = potenciaPorPeriodo.get(periodo)?.contratada?.kw ?? 0;
    if (kwh <= 0 && kw <= 0) return;

    const valorTarifa = valorTarifaEnergia(productoBase, periodo);
    const reparto = repartoOmie(tariff, periodo, fecha);
    const precioEnergiaOferta = round6(tipoProducto === 'Indexed'
      ? valorTarifa + ((form.precioMedio + omieMargin) * reparto * atr) / 1000
      : valorTarifa);

    const precioPotenciaOferta = round6(potenciaBase(productoBase, periodo, tariff, fecha));

    const costeEnergia = kwh > 0 ? round6(kwh * precioEnergiaOferta) : 0;
    const costePotencia = kw > 0 ? round6(kw * precioPotenciaOferta * diasFactura) : 0;

    totalEnergiaOferta += costeEnergia;
    totalPotenciaOferta += costePotencia;
    periodos.push({ periodo, precioEnergiaOferta, precioPotenciaOferta, costeEnergia, costePotencia });
  });

  totalEnergiaOferta = round6(totalEnergiaOferta);
  totalPotenciaOferta = round6(totalPotenciaOferta);

  const energiaReactiva = ocr.totales_electricidad?.energia?.reactiva ?? 0;
  const excesoPotencia = ocr.totales_electricidad?.potencia?.exceso ?? 0;
  const bonoSocial = ocr.bono_social;
  const equipos = ocr.equipos;
  const otrosServicios = ocr.otros_servicios ?? [];
  const descuentos = ocr.descuentos ?? [];

  const otrosConIE = otrosServicios.filter(o => o?.en_base_ie).reduce((s, o) => s + (o.importe ?? 0), 0);
  const otrosSinIE = otrosServicios.filter(o => !o?.en_base_ie).reduce((s, o) => s + (o.importe ?? 0), 0);

  const costesComunesConIE = energiaReactiva + excesoPotencia
    + (bonoSocial?.en_base_ie ? (bonoSocial.importe ?? 0) : 0)
    + (equipos?.en_base_ie ? (equipos.importe ?? 0) : 0)
    + otrosConIE;

  const extraSinIE = (bonoSocial && !bonoSocial.en_base_ie ? (bonoSocial.importe ?? 0) : 0) + otrosSinIE;
  const alquilerSinIE = equipos && !equipos.en_base_ie ? (equipos.importe ?? 0) : 0;

  /* ── Oferta ── */
  const baseIEOferta = totalEnergiaOferta + totalPotenciaOferta + costesComunesConIE;
  const ieOferta = round6(baseIEOferta * rates.ieRate);
  const subTotalOferta = baseIEOferta + ieOferta + extraSinIE + alquilerSinIE;
  const ivaOferta = subTotalOferta * rates.ivaRate;
  const totalOferta = round6(subTotalOferta + ivaOferta);

  /* ── Actual ── */
  const totalEnergiaActual = ocr.totales_electricidad?.energia?.activa ?? 0;
  const totalPotenciaActual = ocr.totales_electricidad?.potencia?.contratada ?? 0;
  const descuentosConIE = descuentos.filter(d => d?.en_base_ie).reduce((s, d) => s + (d.importe ?? 0), 0);
  const descuentosSinIE = descuentos.filter(d => !d?.en_base_ie).reduce((s, d) => s + (d.importe ?? 0), 0);
  const otrosNoComunesActual = descuentosConIE + descuentosSinIE;

  const baseIEActual = totalEnergiaActual + totalPotenciaActual + costesComunesConIE + descuentosConIE;
  const ieActual = round6(baseIEActual * rates.ieRate);
  const subTotalActual = baseIEActual + ieActual + extraSinIE + alquilerSinIE;
  const ivaActual = subTotalActual * rates.ivaRate;
  const totalActual = round6(subTotalActual + ivaActual);

  /* ── Ahorro ── */
  const ahorroEstudio = round3(totalActual - totalOferta);
  const ahorroPorcent = round2((ahorroEstudio / (totalActual || 1)) * 100);

  const kwhTotal = Array.from(energiaPorPeriodo.values()).reduce((s, e) => s + (e.activa?.kwh ?? 0), 0);
  const consumoAnual = kwhTotal * (365 / diasFactura);

  const deltaEnergia = kwhTotal > 0 ? ((totalEnergiaActual - totalEnergiaOferta) / kwhTotal) * consumoAnual : 0;
  const deltaPotencia = ((totalPotenciaActual - totalPotenciaOferta) / diasFactura) * 365;
  const deltaOtros = (otrosNoComunesActual / diasFactura) * 365;
  const ahorroXAnio = (deltaEnergia + deltaPotencia + deltaOtros) * (1 + rates.ieRate + rates.ivaRate);

  /* ── Comisión ── */
  // Ya no se calcula a partir del consumo/fees — viene fija del producto elegido (ver ServiceTariffProduct.fixedCommissionAmount)
  const comision = round3(productoSeleccionado?.fixedCommissionAmount ?? 0);

  return {
    comision, ahorroEstudio, ahorroPorcent, ahorroXAnio, periodos,
    totalActual, baseIEActual: round6(baseIEActual), ieActual, extraSinIE: round6(extraSinIE),
    costesComunesConIEActual: round6(costesComunesConIE), otrosNoComunesActual: round6(otrosNoComunesActual),
    subTotalActual: round6(subTotalActual), ivaActual: round6(ivaActual),
    totalOferta, baseIEOferta: round6(baseIEOferta), ieOferta,
    subTotalOferta: round6(subTotalOferta), ivaOferta: round6(ivaOferta),

    producto: form.producto,
    tipoProducto,
    omieAveragePrice: tipoProducto === 'Indexed' ? form.precioMedio : null,
    annualConsumptionKwh: round2(consumoAnual),
    diasFactura,
  };
}
