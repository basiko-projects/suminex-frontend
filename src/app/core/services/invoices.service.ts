import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvailableInvoiceResponse, GenerateInvoiceDto, GenerateInvoiceResult, InvoiceFilters, InvoicesPagedResponse,
} from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private url = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  /** GET /api/invoices/available — Admin — vista previa de lo facturable ese período */
  getAvailable(collaboratorId: string, period: string): Observable<AvailableInvoiceResponse> {
    const params = new HttpParams().set('collaboratorId', collaboratorId).set('period', period);
    return this.http.get<AvailableInvoiceResponse>(`${this.url}/available`, { params });
  }

  /** POST /api/invoices/generate — Admin — genera la factura y devuelve el PDF crudo (id/invoiceNumber/total van en headers) */
  generate(dto: GenerateInvoiceDto): Observable<GenerateInvoiceResult> {
    return this.http.post(`${this.url}/generate`, dto, { observe: 'response', responseType: 'blob' }).pipe(
      map(res => ({
        id:            res.headers.get('X-Invoice-Id') ?? '',
        invoiceNumber: res.headers.get('X-Invoice-Number') ?? '',
        total:         Number(res.headers.get('X-Invoice-Total') ?? 0),
        pdfBlob:       res.body as Blob,
      })),
    );
  }

  /** GET /api/invoices — Admin — historial completo, opcionalmente filtrado por colaborador */
  getAll(filters?: InvoiceFilters): Observable<InvoicesPagedResponse> {
    let params = new HttpParams();
    if (filters?.collaboratorId) params = params.set('collaboratorId', filters.collaboratorId);
    if (filters?.page)           params = params.set('page',           filters.page);
    if (filters?.pageSize)       params = params.set('pageSize',       filters.pageSize);
    return this.http.get<InvoicesPagedResponse>(this.url, { params });
  }

  /** GET /api/invoices/my — historial propio del colaborador logueado */
  getMine(page = 1, pageSize = 20): Observable<InvoicesPagedResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<InvoicesPagedResponse>(`${this.url}/my`, { params });
  }
}
