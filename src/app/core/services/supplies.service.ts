import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/comparison-history.model';
import { Supply, SupplyFilters } from '../models/supply.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private url = `${environment.apiUrl}/supplies`;

  constructor(private http: HttpClient) {}

  getAll(filters?: SupplyFilters): Observable<PaginatedResponse<Supply>> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.categoryCode) params = params.set('categoryCode', filters.categoryCode);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<PaginatedResponse<Supply>>(this.url, { params });
  }
}
