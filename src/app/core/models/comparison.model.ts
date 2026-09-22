import { ServiceType } from './service.model';

export interface OcrDireccion {
  tipo_via?: string | null;
  nombre_via?: string | null;
  numero?: string | null;
  detalles?: string | null;
  cp?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  ccaa?: string | null;
}

export interface OcrClienteLuz {
  tipo?: string | null;
  titular?: string | null;
  iban?: string | null;
  nif?: string | null;
  cups?: string | null;
  direccion?: OcrDireccion | null;
}

export interface OcrContratoLuz {
  tarifa?: string | null;
  nombre_comercializadora?: string | null;
  numero_orden_comercializadora?: string | null;
  fecha_fin?: string | null;
}

export interface OcrPeriodoFacturacion {
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  numero_dias?: number | null;
  cambio_precios?: boolean | null;
  fecha_cambio_precios?: string | null;
}

export interface OcrEnergiaConcepto {
  kwh?: number | null;
  kvarh?: number | null;
  importe?: number | null;
  tarifa?: number | null;
  es_lectura?: boolean | null;
  porcentaje_iva?: number | null;
}

export interface OcrEnergiaPeriodo {
  p: number;
  activa?: OcrEnergiaConcepto | null;
  reactiva?: OcrEnergiaConcepto | null;
}

export interface OcrPotenciaConcepto {
  kw?: number | null;
  kw_max?: number | null;
  kw_exceso?: number | null;
  importe?: number | null;
  tarifa?: number | null;
  es_lectura?: boolean | null;
  porcentaje_iva?: number | null;
}

export interface OcrPotenciaPeriodo {
  p: number;
  contratada?: OcrPotenciaConcepto | null;
  exceso?: OcrPotenciaConcepto | null;
}

export interface OcrImporteConIva {
  base?: number | null;
  porcentaje?: number | null;
  importe?: number | null;
  en_base_ie?: boolean | null;
  porcentaje_iva?: number | null;
}

export interface OcrTitular {
  nombre?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  calle?: string | null;
  numero?: string | null;
  piso?: string | null;
  puerta?: string | null;
  codigoPostal?: string | null;
  municipio?: string | null;
  provincia?: string | null;
}

export interface LuzOcrResult {
  tipo_documento?: string | null;
  cliente?: OcrClienteLuz | null;
  contrato?: OcrContratoLuz | null;
  fecha_emision?: string | null;
  periodo_facturacion?: OcrPeriodoFacturacion | null;
  energia?: OcrEnergiaPeriodo[] | null;
  potencia?: OcrPotenciaPeriodo[] | null;
  energia_vertida?: { descuento_energia_vertida?: number | null } | null;
  totales_electricidad?: {
    energia?: { activa?: number | null; reactiva?: number | null; excedentes?: number | null } | null;
    potencia?: { contratada?: number | null; exceso?: number | null } | null;
  } | null;
  descuentos?: { concepto: string; importe: number; en_base_ie?: boolean | null; porcentaje_iva?: number | null }[] | null;
  bono_social?: OcrImporteConIva | null;
  equipos?: OcrImporteConIva | null;
  otros_servicios?: any[] | null;
  ie?: OcrImporteConIva | null;
  iva?: { base?: number | null; porcentaje?: number | null; importe?: number | null } | null;
  total: number;
  /* Calculados por el backend a partir de cliente/contrato/periodo_facturacion — no dupliques su edición */
  cups: string;
  tarifa: string;
  diasFacturacion: number;
  fechaDesde: string;
  fechaHasta: string;
  titular: OcrTitular;
}

export interface GasOcrResult {
  cups: string;
  diasFacturacion: number;
  fechaDesde: string;
  fechaHasta: string;
  titular: OcrTitular;
  consumoKwh: number;
  terminoFijoActual: number;
  terminoVariableActual: number;
  totalActual: number;
}

export interface MobileOcrResult {
  numero: string;
  titular: OcrTitular;
  datosGbConsumidos: number;
  minutos: string;
  totalActual: number;
  operadora: string;
}

export interface InternetOcrResult {
  titular: OcrTitular;
  velocidadMbps: number;
  totalActual: number;
  operadora: string;
}

export interface OcrInvoiceResult {
  serviceType: ServiceType;
  luz: LuzOcrResult | null;
  gas: GasOcrResult | null;
  mobile: MobileOcrResult | null;
  internet: InternetOcrResult | null;
}

export interface ExtractComparisonResponse {
  ocrDocumentId: string;
  ocrData: OcrInvoiceResult;
}

export interface SaveComparisonBody {
  ocrDocumentId:      string;
  serviceId:          number;
  cups?:              string | null;
  productName:        string;
  providerName:       string;
  annualConsumption:  number;
  annualSavings:      number;
  monthlySavings:     number;
  savingsPercent:     number;
  commissionAmount:   number;
  commissionPercent:  number;
  energyCommission:   number;
  energyFee:          number;
  powerFee:           number;
  omieAveragePrice:   number | null;
  resultData:         unknown;
}

export interface SaveComparisonResponse {
  comparisonHistoryId: string;
  createdAt:           string;
}

