export type PendingItemStatus = 'Optimized' | 'Cancelled';

export interface AvailableInvoiceItem {
  supplyId:            string;
  comparisonHistoryId: string;
  clientFullName:      string;
  serviceType:         string;
  phoneNumber:         string;
  amount:              number;
  vatRate:             number;
  amountWithVat:       number;
  status:              PendingItemStatus;
}

/** Agrupa por cuándo se optimizó el suministro (optimizedAt), no por si ya se facturó — refleja negocio nuevo, facturado o no.
 *  El % de variación se calcula en el frontend a partir de currentTotal/previousTotal — el backend no siempre manda percentChange. */
export interface InvoiceTrend {
  currentTotal:  number;
  previousTotal: number;
}

export interface AvailableInvoiceResponse {
  items:      AvailableInvoiceItem[];
  subtotal:   number;
  vatAmount:  number;
  total:      number;
  weekTrend:  InvoiceTrend;
  monthTrend: InvoiceTrend;
}

export interface GenerateInvoiceDto {
  collaboratorId: string;
  period:         string;
  paidAmount?:    number | null;
  paidAt?:        string | null;
}

/** POST /api/invoices/generate ahora devuelve el PDF crudo como body (application/pdf) — id/invoiceNumber/total viajan en headers (X-Invoice-Id, X-Invoice-Number, X-Invoice-Total) */
export interface GenerateInvoiceResult {
  id:            string;
  invoiceNumber: string;
  total:         number;
  pdfBlob:       Blob;
}

export type InvoiceStatus = 'Paid';

export interface InvoiceListItem {
  id:                string;
  invoiceNumber:     string;
  collaboratorId:    string;
  collaboratorName:  string;
  collaboratorEmail: string | null;
  period:            string;
  subtotal:          number;
  vatAmount:         number;
  total:             number;
  pdfUrl:            string | null;
  status:            InvoiceStatus;
  paidAmount:        number;
  paidAt:            string;
  generatedAt:       string;
}

export interface InvoicesPagedResponse {
  items:      InvoiceListItem[];
  totalCount: number;
  page:       number;
  pageSize:   number;
}

export interface InvoiceFilters {
  collaboratorId?: string;
  page?:           number;
  pageSize?:       number;
}
