import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ServiceDetail, ServiceGroup, CreateServiceDto, CreateServiceResponse, CreateBoePeriodsDto, CreateOmieDistributionDto, GanaSyncResult } from '../models/service.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private url = `${environment.apiUrl}/services`;

  constructor(private http: HttpClient) {}

  /** GET /api/services → array plano de ServiceGroup (uno por servicio, cada uno con sus tarifas) */
  getServices(): Observable<ServiceGroup[]> {
    return this.http.get<ServiceGroup[]>(this.url);
  }

  getById(id: number): Observable<ServiceDetail> {
    return this.http.get<ServiceDetail>(`${this.url}/${id}`);
  }

  create(body: CreateServiceDto): Observable<CreateServiceResponse> {
    return this.http.post<CreateServiceResponse>(this.url, body);
  }

  update(id: number, body: Partial<ServiceDetail>): Observable<any> {
    return this.http.put(`${this.url}/${id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  createTariff(dto: { serviceId: string; name: string; code: string | null }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/tariffs`, dto);
  }

  createProduct(tariffId: number, dto: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/tariffs/${tariffId}/products`, dto);
  }

  getProductById(tariffId: number, productId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/tariffs/${tariffId}/products/${productId}`);
  }

  deleteProduct(tariffId: number, productId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/tariffs/${tariffId}/products/${productId}`);
  }

  updateProduct(tariffId: number, productId: number, dto: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/tariffs/${tariffId}/products/${productId}`, dto);
  }

  createBoe(id: number, dto: CreateBoePeriodsDto): Observable<any> {
    return this.http.post(`${environment.apiUrl}/tariffs/${id}/boe-periods`, dto);
  }

  updateBoe(id: number, dto: CreateBoePeriodsDto): Observable<any> {
    return this.http.put(`${environment.apiUrl}/tariffs/${id}/boe-periods`, dto);
  }

  createOmie(id: number, dto: CreateOmieDistributionDto): Observable<any> {
    return this.http.post(`${environment.apiUrl}/tariffs/${id}/omie-distributions`, dto);
  }

  updateOmieDistribution(tariffId: number, distributionId: number, dto: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/tariffs/${tariffId}/omie-distributions/${distributionId}`, dto);
  }

  /** POST /api/admin/gana-tariffs/sync — Admin, sin body. Siempre 200; revisar warnings[] igual. */
  syncGanaTariffs(): Observable<GanaSyncResult> {
    return this.http.post<GanaSyncResult>(`${environment.apiUrl}/admin/gana-tariffs/sync`, null);
  }
}
