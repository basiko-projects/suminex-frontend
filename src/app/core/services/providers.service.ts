import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Provider, ProviderForm } from '../models/provider.model';
import { Observable } from 'rxjs';

interface ApiResponse<T = void> {
  isSuccess: boolean;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private url = `${environment.apiUrl}/admin/providers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.url);
  }

  create(body: ProviderForm): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(this.url, body);
  }

  update(id: number, body: ProviderForm): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.url}/${id}`, body);
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.url}/${id}`);
  }
}
