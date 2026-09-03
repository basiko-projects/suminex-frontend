import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserFilters, UsersPagedResponse, CreateUserDto, UpdateUserDto, UserRole, ChangeRoleResponse } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(filters?: UserFilters): Observable<UsersPagedResponse> {
    let params = new HttpParams();
    if (filters?.role)                              params = params.set('role',       filters.role);
    if (filters?.isActive   !== undefined)          params = params.set('isActive',   filters.isActive);
    if (filters?.isVerified !== undefined)          params = params.set('isVerified', filters.isVerified);
    if (filters?.page)                              params = params.set('page',       filters.page);
    if (filters?.pageSize)                          params = params.set('pageSize',   filters.pageSize);
    return this.http.get<UsersPagedResponse>(this.url, { params });
  }

  create(dto: CreateUserDto): Observable<any> {
    return this.http.post(this.url, dto);
  }

  update(id: string, dto: UpdateUserDto): Observable<any> {
    return this.http.put(`${this.url}/${id}`, dto);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** PATCH /api/users/{id}/role — Admin — único mecanismo para cambiar el rol de un usuario */
  changeRole(id: string, role: UserRole): Observable<ChangeRoleResponse> {
    return this.http.patch<ChangeRoleResponse>(`${this.url}/${id}/role`, { role });
  }
}
