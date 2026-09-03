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
  password?: string;
}

export interface ChangeRoleResponse {
  userId: string;
  role:   UserRole;
}
