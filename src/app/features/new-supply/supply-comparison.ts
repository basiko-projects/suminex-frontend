import { ServiceGroup, ServiceTariff, ServiceType } from '../../core/models/service.model';
import { GasOcrResult, LuzOcrResult, OcrInvoiceResult } from '../../core/models/comparison.model';

export interface SupplyComparisonResult {
  serviceType:         ServiceType;
  currentTotal:        number;
  currentProviderName: string | null;
  bestTariffId:        number;
  bestTariffName:      string;
  bestTariffCode:      string | null;
  estimatedTotal:      number;
  savingsAmount:       number;
  savingsPercent:      number;
}

/** IVA de electricidad no viene desglosado en algunas facturas de gas/internet — se usa el tipo general (21%) como aproximación. */
const DEFAULT_IVA_RATE = 0.21;

function estimateLuzTariffTotal(luz: LuzOcrResult, tariff: ServiceTariff): number | null {
  const pr = tariff.pricing;
  if (!pr) return null;

  const energyPrice = pr.priceKwh ?? (
    pr.priceMinKwh != null && pr.priceMaxKwh != null ? (pr.priceMinKwh + pr.priceMaxKwh) / 2 : null
  );
  if (energyPrice == null) return null;

  const energyTotal = (luz.energia ?? []).reduce((sum, e) => sum + (e.activa?.kwh ?? 0) * energyPrice, 0);

  const dias = luz.diasFacturacion || 30;
  const powerTotal = (luz.potencia ?? []).reduce((sum, p) => {
    const kw = p.contratada?.kw ?? 0;
    const boe = tariff.boePeriods?.find(b => b.period === `P${p.p}`);
    if (!boe) return sum;
    return sum + kw * boe.priceKwDay * dias;
  }, 0);

  const baseImponible = energyTotal + powerTotal;
  const ieRate = (luz.ie?.porcentaje ?? 5.11269632) / 100;
  const ie = baseImponible * ieRate;
  const ivaRate = (luz.iva?.porcentaje ?? 21) / 100;
  const iva = (baseImponible + ie) * ivaRate;
  return baseImponible + ie + iva;
}

function estimateGasTariffTotal(gas: GasOcrResult, tariff: ServiceTariff): number | null {
  const pr = tariff.pricing;
  if (!pr || pr.priceKwh == null) return null;

  const dias = gas.diasFacturacion || 30;
  const variable = gas.consumoKwh * pr.priceKwh;
  const fixed = (pr.fixedTermMonthly ?? 0) * (dias / 30);
  return (variable + fixed) * (1 + DEFAULT_IVA_RATE);
}

function estimateInternetTariffTotal(tariff: ServiceTariff): number | null {
  return tariff.pricing?.monthlyFee ?? null;
}

export function computeSupplyComparison(
  ocrData: OcrInvoiceResult,
  serviceGroups: ServiceGroup[],
): SupplyComparisonResult | null {
  const group = serviceGroups.find(g => g.serviceType === ocrData.serviceType);
  if (!group?.tariffs?.length) return null;

  let currentTotal: number;
  let currentProviderName: string | null;
  let estimateFn: (tariff: ServiceTariff) => number | null;

  if (ocrData.serviceType === 'LUZ' && ocrData.luz) {
    currentTotal = ocrData.luz.total;
    currentProviderName = ocrData.luz.contrato?.nombre_comercializadora ?? null;
    estimateFn = t => estimateLuzTariffTotal(ocrData.luz!, t);
  } else if (ocrData.serviceType === 'GAS' && ocrData.gas) {
    currentTotal = ocrData.gas.totalActual;
    currentProviderName = null;
    estimateFn = t => estimateGasTariffTotal(ocrData.gas!, t);
  } else if (ocrData.serviceType === 'INTERNET' && ocrData.internet) {
    currentTotal = ocrData.internet.totalActual;
    currentProviderName = ocrData.internet.operadora ?? null;
    estimateFn = t => estimateInternetTariffTotal(t);
  } else {
    return null;
  }

  const estimates = group.tariffs
    .map(tariff => ({ tariff, total: estimateFn(tariff) }))
    .filter((e): e is { tariff: ServiceTariff; total: number } => e.total != null && e.total > 0);

  if (!estimates.length) return null;

  const cheapest = estimates.reduce((min, e) => (e.total < min.total ? e : min));
  const savingsAmount = currentTotal - cheapest.total;
  const savingsPercent = currentTotal > 0 ? (savingsAmount / currentTotal) * 100 : 0;

  return {
    serviceType: ocrData.serviceType,
    currentTotal,
    currentProviderName,
    bestTariffId: cheapest.tariff.id,
    bestTariffName: cheapest.tariff.name,
    bestTariffCode: cheapest.tariff.code,
    estimatedTotal: cheapest.total,
    savingsAmount,
    savingsPercent,
  };
}
