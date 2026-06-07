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
  luz:      ServiceListItem[];
  gas:      ServiceListItem[];
  mobile:   ServiceListItem[];
  internet: ServiceListItem[];
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
  id?:                 number;         // requerido en PUT, omitido en POST
  name:                string;
  productType:         'INDEXED' | 'FIXED';
  commissionEnergyPct: number | null;
  commissionPowerPct:  number | null;
  validFrom:           string;
  validUntil:          string | null;
  energyPeriods:       EnergyPeriodDto[];
  powerPeriods:        PowerPeriodDto[];
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

export interface CreateServiceDto {
  name:        string;
  serviceType: ServiceType;
  tariffCode:  string | null;
  validFrom:   string | null;
  validUntil:  string | null;
  // LUZ
  products?:       ProductDto[];
  // GAS
  gasDetail?:      GasDetailDto;
  // MOBILE
  mobileDetail?:   MobileDetailDto;
  // INTERNET
  internetDetail?: InternetDetailDto;
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
