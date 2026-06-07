import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ComparisonHistoryFilters, ComparisonHistoryResponse } from '../models/comparison-history.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ComparisonHistoryService {
  private url = `${environment.apiUrl}/comparisons/history`;

  constructor(private http: HttpClient) {}

  getAll(filters?: ComparisonHistoryFilters): Observable<ComparisonHistoryResponse> {
    let params = new HttpParams();
    if (filters?.page)                           params = params.set('page', filters.page);
    if (filters?.pageSize)                       params = params.set('pageSize', filters.pageSize);
    if (filters?.willCloseContract !== undefined) params = params.set('willCloseContract', filters.willCloseContract);
    if (filters?.from)                           params = params.set('from', filters.from);
    if (filters?.to)                             params = params.set('to', filters.to);
    return this.http.get<ComparisonHistoryResponse>(this.url, { params });
  }
}
