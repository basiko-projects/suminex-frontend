export type StatsGroupBy = 'day' | 'week' | 'month';

export interface DashboardStatsFilters {
  from: string;
  to: string;
  groupBy?: StatsGroupBy;
}

export interface DashboardKpi {
  value: number;
  previousValue: number;
  /** Ausente (no null) cuando previousValue es 0 — no hay base de comparación */
  changePercent?: number;
}

export interface DashboardStatsSummary {
  /** Suministros con status "Optimized" en el rango */
  managedSupplies: DashboardKpi;
  /** Suministros con status "Pending" en el rango */
  pendingSupplies: DashboardKpi;
  /** Total de comparativas creadas en el rango */
  comparisons: DashboardKpi;
  /** Promedio del estimatedSavings de los suministros creados en el rango (KPI provisional, no es revenue real) */
  avgOrderValue: DashboardKpi;
  /** Comisión total generada (suma de fixedCommissionAmount de los suministros facturados) en el rango */
  commissionGenerated: DashboardKpi;
}

export interface DashboardTimeseriesPoint {
  date: string;
  /** Suministros creados en el bucket, cualquier status */
  supplies: number;
  /** Comparativas creadas en el bucket */
  comparisons: number;
}

export interface DashboardStatsResponse {
  summary: DashboardStatsSummary;
  timeseries: DashboardTimeseriesPoint[];
  /** Total pendiente de facturar este mes (no varía por período activo — siempre es "este mes") */
  availableToInvoiceThisMonth: number;
}
