import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiscalProfile, UpsertFiscalProfileDto } from '../models/fiscal-profile.model';

@Injectable({ providedIn: 'root' })
export class FiscalProfileService {
  private url = `${environment.apiUrl}/fiscal-profile`;

  constructor(private http: HttpClient) {}

  /** GET /api/fiscal-profile — null si el usuario todavía no cargó sus datos */
  get(): Observable<FiscalProfile | null> {
    return this.http.get<FiscalProfile | null>(this.url);
  }

  /** PUT /api/fiscal-profile — upsert: crea si no existe, actualiza si ya existe */
  upsert(dto: UpsertFiscalProfileDto): Observable<FiscalProfile> {
    return this.http.put<FiscalProfile>(this.url, dto);
  }

  /** PUT /api/fiscal-profile/{userId} — Admin: carga/edita los datos fiscales de otro usuario (sin GET previo, no hay endpoint para leerlos) */
  upsertFor(userId: string, dto: UpsertFiscalProfileDto): Observable<FiscalProfile> {
    return this.http.put<FiscalProfile>(`${this.url}/${userId}`, dto);
  }
}
