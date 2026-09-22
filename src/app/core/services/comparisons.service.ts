import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExtractComparisonResponse, SaveComparisonBody, SaveComparisonResponse } from '../models/comparison.model';
import { ServiceType } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ComparisonsService {
  private url = `${environment.apiUrl}/comparisons`;

  constructor(private http: HttpClient) {}

  /** POST /api/comparisons/extract (multipart/form-data) → OCR de la factura subida */
  extract(file: File, serviceType: ServiceType): Observable<ExtractComparisonResponse> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('ServiceType', serviceType);
    return this.http.post<ExtractComparisonResponse>(`${this.url}/extract`, formData);
  }

  /** POST /api/comparisons/save — persiste el snapshot ya calculado en la web, sin recalcular nada en el backend */
  save(body: SaveComparisonBody): Observable<SaveComparisonResponse> {
    return this.http.post<SaveComparisonResponse>(`${this.url}/save`, body);
  }
}
