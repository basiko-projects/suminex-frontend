import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ComparisonHistoryFilters, ComparisonHistoryItem, PaginatedResponse } from '../models/comparison-history.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ComparisonHistoryService {
  private url = `${environment.apiUrl}/admin/comparison-history`;

  constructor(private http: HttpClient) {}

  getAll(filters?: ComparisonHistoryFilters): Observable<PaginatedResponse<ComparisonHistoryItem>> {
    let params = new HttpParams();
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.serviceId) params = params.set('serviceId', filters.serviceId);
    if (filters?.contracted !== undefined) params = params.set('contracted', filters.contracted);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    return this.http.get<PaginatedResponse<ComparisonHistoryItem>>(this.url, { params });
  }
}
