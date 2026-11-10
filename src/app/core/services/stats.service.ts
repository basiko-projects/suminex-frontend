import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardStatsFilters, DashboardStatsResponse } from '../models/stats.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private url = `${environment.apiUrl}/stats/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(filters: DashboardStatsFilters): Observable<DashboardStatsResponse> {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.groupBy)       params = params.set('groupBy', filters.groupBy);
    if (filters.collaboratorId) params = params.set('collaboratorId', filters.collaboratorId);
    return this.http.get<DashboardStatsResponse>(this.url, { params });
  }
}
