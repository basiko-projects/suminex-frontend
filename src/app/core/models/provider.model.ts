export interface Provider {
  id: number;
  name: string;
  cif: string;
  isActive: boolean;
  serviceCount: number;
  createdAt: string;
}

export interface ProviderForm {
  name: string;
  cif: string;
  isActive?: boolean;
}
