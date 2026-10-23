import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Provider } from '../models/provider.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private url = `${environment.apiUrl}/providers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.url);
  }

  /** form debe traer 'Name' (string) y 'Logo' (file, obligatorio) */
  create(form: FormData): Observable<Provider> {
    return this.http.post<Provider>(this.url, form);
  }

  /** form debe traer 'Name'; 'Logo' es opcional — si no se manda, el backend conserva el actual */
  update(id: string, form: FormData): Observable<Provider> {
    return this.http.put<Provider>(`${this.url}/${id}`, form);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
