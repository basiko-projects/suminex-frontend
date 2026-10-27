import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CancelSupplyResponse, CompleteSupplyResponse, ExternalSubmissionStatus, LinkIdentityResponse, RegisterSupplyResponse, Supply, SupplyFilters, SupplyListResponse, ValidationResult, VerifyIdentityResponse } from '../models/supply.model';
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

  /** POST /api/supplies/register-direct — reemplaza a register-with-identity: da de alta el suministro sin
   *  comparativa de tarifa (OcrDocumentId es solo trazabilidad opcional) y verifica identidad si mandás las fotos
   *  de DNI, pero no bloquea el alta si no las mandás o si la verificación falla (best-effort). Admin/Collaborator only. */
  registerDirect(formData: FormData): Observable<RegisterSupplyResponse> {
    return this.http.post<RegisterSupplyResponse>(`${this.url}/register-direct`, formData);
  }

  /** POST /api/supplies/verify-identity — para subir los documentos más tarde, sobre un suministro que ya quedó
   *  en PendingIdentityVerification. Ya no se usa en el alta (ver registerDirect). Ya NO coteja holderDni contra
   *  el OCR de la foto — solo sube los archivos; nunca falla por "no coincide" o "foto ilegible". */
  verifyIdentity(dniFront: File, dniBack: File, holderDni: string): Observable<VerifyIdentityResponse> {
    const formData = new FormData();
    formData.append('DniFront', dniFront);
    formData.append('DniBack', dniBack);
    formData.append('HolderDni', holderDni);
    return this.http.post<VerifyIdentityResponse>(`${this.url}/verify-identity`, formData);
  }

  /** POST /api/supplies/{id}/complete — solo desde InProgress; pasa el suministro a Optimized (ya facturable).
   *  Sin body — el producto ya quedó guardado desde el alta directa (ver registerDirect). */
  complete(id: string): Observable<CompleteSupplyResponse> {
    return this.http.post<CompleteSupplyResponse>(`${this.url}/${id}/complete`, null);
  }

  /** POST /api/supplies/{id}/link-identity — enlaza documentos ya verificados a un suministro creado sin ellos; pasa a InProgress */
  linkIdentity(id: string, dniFrontDocumentId: string, dniBackDocumentId: string): Observable<LinkIdentityResponse> {
    return this.http.post<LinkIdentityResponse>(`${this.url}/${id}/link-identity`, { dniFrontDocumentId, dniBackDocumentId });
  }

  /** POST /api/supplies/validate-iban — nunca mandar iban vacío: el backend lo intenta validar igual contra Gana,
   *  Gana lo rechaza y el código actual lo confunde con un error de red, devolviendo isValid:true falso-positivo. */
  validateIban(iban: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.url}/validate-iban`, { iban, integrationCode: null });
  }

  /** POST /api/supplies/validate-phone — mismo cuidado que validateIban: nunca mandar phoneNumber vacío. */
  validatePhone(prefix: string, phoneNumber: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.url}/validate-phone`, { prefix, phoneNumber, integrationCode: null });
  }

  /** POST /api/supplies/{id}/cancel — da de baja el suministro; funciona en cualquier estado, incluido Optimized */
  cancel(id: string, reason?: string): Observable<CancelSupplyResponse> {
    return this.http.post<CancelSupplyResponse>(`${this.url}/${id}/cancel`, { reason: reason ?? null });
  }

  /** GET /api/supplies/{id}/external-submission — 404 si nunca se intentó un envío (proveedor sin integración, el caso normal) */
  getExternalSubmission(id: string): Observable<ExternalSubmissionStatus> {
    return this.http.get<ExternalSubmissionStatus>(`${this.url}/${id}/external-submission`);
  }

  /** POST /api/supplies/{id}/external-submission/retry — sin body; solo funciona si el estado actual es Failed */
  retryExternalSubmission(id: string): Observable<ExternalSubmissionStatus> {
    return this.http.post<ExternalSubmissionStatus>(`${this.url}/${id}/external-submission/retry`, null);
  }
}
