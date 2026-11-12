export type UserRole = 'Admin' | 'Client' | 'Collaborator';

export interface UserItem {
  id:         string;
  fullName:   string;
  email:      string;
  phone:      string | null;
  role:       UserRole;
  isActive:   boolean;
  isVerified: boolean;
  createdAt:  string;
}

export interface UsersPagedResponse {
  items:          UserItem[];
  totalCount:     number;
  page:           number;
  pageSize:       number;
  totalPages:     number;
  hasNextPage:    boolean;
  hasPreviousPage: boolean;
}

export interface UserFilters {
  role?:       UserRole;
  isActive?:   boolean;
  isVerified?: boolean;
  page?:       number;
  pageSize?:   number;
}

export interface CreateUserDto {
  fullName: string;
  email:    string;
  phone:    string;
  password: string;
  role:     'Admin' | 'Collaborator';
}

export interface UpdateUserDto {
  fullName: string;
  email:    string;
  phone:    string;
  role:     'Admin' | 'Collaborator';
  isActive: boolean;
}

export interface ChangeRoleResponse {
  userId: string;
  role:   UserRole;
}

/** Respuesta de POST /api/users/{id}/reset-password — el backend genera la contraseña y la manda por email,
 *  no se puede elegir una propia desde el panel */
export interface ResetPasswordResponse {
  message: string;
}
