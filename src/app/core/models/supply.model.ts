export type SupplyStatus = 'Pending' | 'Active' | 'Cancelled' | 'Completed';
export type CategoryCode = 'LUZ' | 'GAS' | 'MOVIL' | 'INTERNET';

export interface Supply {
  id: string;
  userId: string;
  userEmail: string;
  categoryCode: CategoryCode;
  offerName: string;
  providerName: string;
  status: SupplyStatus;
  cups: string;
  calculatedSavings: number;
  holderName: string;
  holderDni: string;
  createdAt: string;
}

export interface SupplyFilters {
  status?: SupplyStatus;
  categoryCode?: CategoryCode;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
