export type ServiceType = 'LUZ' | 'GAS' | 'MOBILE' | 'INTERNET';

/* ── New API format: GET /api/services ── */
export interface ServiceTariffPricing {
  serviceType:        string;
  productType?:       string | null;
  gasProductType?:    string | null;
  priceMinKwh?:       number | null;
  priceMaxKwh?:       number | null;
  priceKwh?:          number | null;
  omieMarginKwh?:     number | null;
  indexMargin?:       number | null;
  fixedTermMonthly?:  number | null;
  productsCount?:     number | null;
  monthlyFee?:        number | null;
  dataGb?:            number | null;
  voiceMinutes?:      number | null;
  network?:           string | null;
  permanenceMonths?:  number | null;
  cancellationFee?:   number | null;
  speedDownMbps?:     number | null;
  speedUpMbps?:       number | null;
  technology?:        string | null;
  routerIncluded?:    boolean | null;
  includesTv?:        boolean | null;
}

export interface ServiceTariffProduct {
  id:       number;
  name:     string;
  type:     string;
  isActive: boolean;
  /* Campos de precio por período — el listado agrupado no los documenta explícitamente;
     se leen de forma defensiva (undefined si el backend no los incluye aquí). */
  commissionEnergyPct?:   number | null;
  commissionPowerPct?:    number | null;
  fixedCommissionAmount?: number | null;
  providerId?:            string | null;
  providerName?:          string | null;
  providerLogoUrl?:       string | null;
  /** Id de tarifa en el catálogo de la integración externa (ej. Gana) — sin esto, un producto de un
   *  proveedor con integración activa nunca se puede enviar (el suministro queda en Failed). */
  externalTariffId?:      string | null;
  energyPeriods?:         EnergyPeriodDto[];
  powerPeriods?:          PowerPeriodDto[];
}

export interface ServiceTariffBoePeriod {
  period:     string;
  priceKwDay: number;
  validFrom:  string;
  validUntil?: string | null;
}

export interface ServiceTariffOmieDistribution {
  id:         number;
  name:       string;
  isActive:   boolean;
  validFrom:  string;
  validUntil?: string | null;
  margin?:    number | null;
  periods:    { period: string; factor: number }[];
}

export interface ServiceTariff {
  id:                 number;
  name:               string;
  code:               string | null;
  isActive?:          boolean;
  pricing?:           ServiceTariffPricing;
  products?:          ServiceTariffProduct[];
  boePeriods?:        ServiceTariffBoePeriod[];
  omieDistributions?: ServiceTariffOmieDistribution[];
}

export interface ServiceGroup {
  id:          string;
  name:        string;
  serviceType: string;
  tariffs:     ServiceTariff[];
}

export interface ServiceListItem {
  id: number;
  providerId: number;
  providerName: string;
  serviceType: ServiceType;
  name: string;
  tariffCode: string | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export interface ServiceFilters {
  providerId?: number;
  serviceType?: ServiceType;
  isActive?: boolean;
}

export interface ServiceGroupedResponse {
  luz:      ServiceGroup[];
  gas:      ServiceGroup[];
  mobile:   ServiceGroup[];
  internet: ServiceGroup[];
}

/* ── Create DTOs ── */

export interface EnergyPeriodDto {
  period:    string;
  priceKwh:  number | null;
  baseValue: number | null;
}

export interface PowerPeriodDto {
  period:     string;
  priceKwDay: number | null;
}

export interface ProductDto {
  id?:                    number;         // requerido en PUT, omitido en POST
  name:                   string;
  productType:            'INDEXED' | 'FIXED';
  commissionEnergyPct:    number | null;
  commissionPowerPct:     number | null;
  fixedCommissionAmount:  number | null;
  providerId:             string | null;
  providerName?:          string | null;   // solo lectura — viene poblado en GET, no se manda al crear/editar
  providerLogoUrl?:       string | null;    // solo lectura
  externalTariffId:       string | null;
  validFrom:              string;
  validUntil:             string | null;
  energyPeriods:          EnergyPeriodDto[];
  powerPeriods:           PowerPeriodDto[];
}

export interface GasTierDto {
  tierOrder: number;
  minKwh:    number;
  maxKwh:    number | null;
  priceKwh:  number;
}

export interface GasDetailDto {
  productType:   'FIXED' | 'INDEXED';
  fixedTermDay:  number | null;
  marginKwh:     number | null;
  indexMargin:   number | null;
  commissionKwh: number | null;
  tiers:         GasTierDto[];
}

export interface MobileDetailDto {
  monthlyFee:        number;
  dataGb:            number | null;
  network:           string;
  voiceMinutes:      number | null;
  extraGbPrice:      number | null;
  permanenceMonths:  number | null;
  cancellationFee:   number | null;
}

export interface InternetDetailDto {
  monthlyFee:       number;
  speedDownMbps:    number;
  speedUpMbps:      number;
  technology:       string;
  permanenceMonths: number | null;
  cancellationFee:  number | null;
  routerIncluded:   boolean;
  includesTv:       boolean;
}

/** Respuesta de POST /api/admin/gana-tariffs/sync — siempre 200 , incluso si algo falló del lado de Gana;
 *  hay que revisar siempre warnings.length > 0, no solo los contadores. */
export interface GanaSyncResult {
  luzTariffsCreated:   number;
  luzProductsCreated:  number;
  luzProductsUpdated:  number;
  luzSkipped:          number;
  gasTariffsCreated:   number;
  gasDetailsCreated:   number;
  gasDetailsUpdated:   number;
  gasSkipped:          number;
  warnings:            string[];
}

export interface CreateServiceDto {
  name:        string;
  serviceType: ServiceType;
}

export interface CreateServiceResponse {
  id:          string;
  name:        string;
  serviceType: ServiceType;
  createdAt:   string;
}

/* ── BOE / OMIE ── */
export interface BoePeriodItem {
  period:     string;
  priceKwDay: number;
  validFrom:  string;
  validUntil: string | null;
}

export interface OmiePeriodItem {
  period: string;
  factor: number;
}

export interface OmieDistribution {
  id:         number;
  name:       string;
  margin:     number | null;
  isActive:   boolean;
  validFrom:  string;
  validUntil: string | null;
  periods:    OmiePeriodItem[];
}

export interface CreateBoePeriodsDto {
  validFrom:  string;
  validUntil: string | null;
  periods:    { period: string; value: number }[];
}

export interface CreateOmieDistributionDto {
  name:       string;
  margin:     number | null;
  validFrom:  string;
  validUntil: string | null;
  periods:    OmiePeriodItem[];
}

/* ── Detail (for GET by id, edit) ── */
export interface ServiceDetail extends ServiceListItem {
  tariffCode:         string | null;
  products?:          ProductDto[];
  boePeriods?:        BoePeriodItem[];
  omieDistributions?: OmieDistribution[];
  gasDetail?:         GasDetailDto;
  mobileDetail?:      MobileDetailDto;
  internetDetail?:    InternetDetailDto;
}
