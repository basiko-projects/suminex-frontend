import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CancelSupplyResponse, CompleteSupplyResponse, LinkIdentityResponse, RegisterSupplyResponse, Supply, SupplyFilters, SupplyListResponse, VerifyIdentityResponse } from '../models/supply.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private url = `${environment.apiUrl}/supplies`;

  constructor(private http: HttpClient) {}

  getAll(filters?: SupplyFilters): Observable<SupplyListResponse> {
    let params = new HttpParams();
    if (filters?.page)        params = params.set('page',        filters.page);
    if (filters?.pageSize)    params = params.set('pageSize',    filters.pageSize);
    if (filters?.userId)      params = params.set('userId',      filters.userId);
    if (filters?.serviceType) params = params.set('serviceType', filters.serviceType);
    if (filters?.status)      params = params.set('status',      filters.status);
    if (filters?.dateFrom)    params = params.set('dateFrom',    filters.dateFrom);
    if (filters?.dateTo)      params = params.set('dateTo',      filters.dateTo);
    if (filters?.userName)    params = params.set('userName',    filters.userName);
    if (filters?.userEmail)   params = params.set('userEmail',   filters.userEmail);
    return this.http.get<SupplyListResponse>(this.url, { params });
  }

  /** POST /api/supplies/register-with-identity — único endpoint de alta (reemplaza el viejo POST /api/supplies JSON,
   *  que ya no existe). Multipart: crea el suministro y verifica identidad en una sola llamada; siempre 200 si los
   *  datos base son válidos, aunque la identidad no matchee o falten las fotos (verificationSuccess: false). */
  registerWithIdentity(formData: FormData): Observable<RegisterSupplyResponse> {
    return this.http.post<RegisterSupplyResponse>(`${this.url}/register-with-identity`, formData);
  }

  /** POST /api/supplies/verify-identity — para verificar identidad más tarde, sobre un suministro que ya quedó
   *  en PendingIdentityVerification. Ya no se usa en el alta (ver registerWithIdentity).
   *  holderDni: el DNI que el titular confirmó en el formulario — el backend lo compara contra el OCR de DniFront y falla si no coincide. */
  verifyIdentity(dniFront: File, dniBack: File, holderDni: string): Observable<VerifyIdentityResponse> {
    const formData = new FormData();
    formData.append('DniFront', dniFront);
    formData.append('DniBack', dniBack);
    formData.append('HolderDni', holderDni);
    return this.http.post<VerifyIdentityResponse>(`${this.url}/verify-identity`, formData);
  }

  /** POST /api/supplies/{id}/complete — solo desde InProgress; pasa el suministro a Optimized (ya facturable) */
  complete(id: string): Observable<CompleteSupplyResponse> {
    return this.http.post<CompleteSupplyResponse>(`${this.url}/${id}/complete`, null);
  }

  /** POST /api/supplies/{id}/link-identity — enlaza documentos ya verificados a un suministro creado sin ellos; pasa a InProgress */
  linkIdentity(id: string, dniFrontDocumentId: string, dniBackDocumentId: string): Observable<LinkIdentityResponse> {
    return this.http.post<LinkIdentityResponse>(`${this.url}/${id}/link-identity`, { dniFrontDocumentId, dniBackDocumentId });
  }

  /** POST /api/supplies/{id}/cancel — da de baja el suministro; funciona en cualquier estado, incluido Optimized */
  cancel(id: string, reason?: string): Observable<CancelSupplyResponse> {
    return this.http.post<CancelSupplyResponse>(`${this.url}/${id}/cancel`, { reason: reason ?? null });
  }
}
