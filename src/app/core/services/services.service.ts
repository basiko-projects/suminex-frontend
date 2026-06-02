import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ServiceDetail, ServiceFilters, ServiceListItem, ServiceGroupedResponse, CreateServiceDto } from '../models/service.model';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private url     = `${environment.apiUrl}/services`;

  constructor(private http: HttpClient) {}

  /** GET /api/services — devuelve agrupado, lo aplanamos internamente */
  getAll(filters?: ServiceFilters): Observable<ServiceListItem[]> {
    let params = new HttpParams();
    // Solo isActive va al servidor; el resto se filtra en cliente
    if (filters?.isActive !== undefined) params = params.set('isActive', filters.isActive);
    return this.http.get<ServiceGroupedResponse>(this.url, { params }).pipe(
      map(r => [
        ...(r.luz      ?? []).map(s => ({ ...s, serviceType: 'LUZ'      as const })),
        ...(r.gas      ?? []).map(s => ({ ...s, serviceType: 'GAS'      as const })),
        ...(r.mobile   ?? []).map(s => ({ ...s, serviceType: 'MOBILE'   as const })),
        ...(r.internet ?? []).map(s => ({ ...s, serviceType: 'INTERNET' as const })),
      ])
    );
  }

  /** GET /api/services — aplanado con todos los grupos */
  getGrouped(isActive?: boolean): Observable<ServiceGroupedResponse> {
    let params = new HttpParams();
    if (isActive !== undefined) params = params.set('isActive', isActive);
    return this.http.get<ServiceGroupedResponse>(this.url, { params });
  }

  getById(id: number): Observable<ServiceDetail> {
    return this.http.get<ServiceDetail>(`${this.url}/${id}`);
  }

  create(body: CreateServiceDto): Observable<any> {
    return this.http.post(this.url, body);
  }

  update(id: number, body: Partial<ServiceDetail>): Observable<any> {
    return this.http.put(`${this.url}/${id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
