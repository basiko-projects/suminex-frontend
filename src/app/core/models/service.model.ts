export type ServiceType = 'LUZ' | 'GAS' | 'MOBILE' | 'INTERNET';

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
  priceKwh:  number;
  baseValue: number | null;
}

export interface PowerPeriodDto {
  period:    string;
  priceKwDay: number;
}

export interface ProductDto {
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

/* ── Detail (for GET by id, edit) ── */
export interface ServiceDetail extends ServiceListItem {
  tariffCode:    string | null;
  products?:     ProductDto[];
  gasDetail?:    GasDetailDto;
  mobileDetail?: MobileDetailDto;
  internetDetail?: InternetDetailDto;
}
