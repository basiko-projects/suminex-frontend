import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Supply, SupplyFilters, SupplyListResponse } from '../models/supply.model';
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
}
