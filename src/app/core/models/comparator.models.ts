export type Period = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

export interface ComparadorFormValue {
  producto:    string;
  /** Precio medio OMIE estimado (€/MWh) — solo aplica a productos Indexed; el usuario lo ajusta manualmente */
  precioMedio: number;
}

export interface PeriodoResultado {
  periodo:              Period;
  precioEnergiaOferta:  number;
  precioPotenciaOferta: number;
  costeEnergia:         number;
  costePotencia:        number;
}

export interface TaxRates {
  ieRate:  number;
  ivaRate: number;
}

export interface ComparatorResult {
  comision:       number;
  ahorroEstudio:  number;
  ahorroPorcent:  number;
  ahorroXAnio:    number;
  periodos:       PeriodoResultado[];

  totalActual:               number;
  baseIEActual:              number;
  ieActual:                  number;
  extraSinIE:                number;
  costesComunesConIEActual:  number;
  otrosNoComunesActual:      number;
  subTotalActual:            number;
  ivaActual:                 number;

  totalOferta:      number;
  baseIEOferta:     number;
  ieOferta:         number;
  subTotalOferta:   number;
  ivaOferta:        number;

  /* Snapshot de auditoría — para persistir en POST /api/comparisons/save */
  producto:             string;
  tipoProducto:         'Fixed' | 'Indexed';
  omieAveragePrice:     number | null;
  annualConsumptionKwh: number;
  diasFactura:          number;
}
