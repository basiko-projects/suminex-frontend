export interface ComparisonHistoryItem {
  id: number;
  userId: string;
  userEmail: string;
  ocrDocumentId: string | null;
  supplyId: string | null;
  serviceId: number;
  cups: string;
  estimatedSavings: number;
  contracted: boolean;
  contractedAt: string | null;
  calculatedAt: string;
}

export interface ComparisonHistoryFilters {
  userId?: string;
  serviceId?: number;
  contracted?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  isSuccess: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}
