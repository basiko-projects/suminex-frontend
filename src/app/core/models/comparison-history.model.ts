export interface ComparisonHistoryItem {
  id:                string;
  userId:            string;
  userFullName:      string;
  userEmail:         string;
  cups:              string;
  productName:       string;
  providerName:      string;
  annualConsumption: number;
  annualSavings:     number;
  monthlySavings:    number;
  savingsPercent:    number;
  commissionAmount:  number;
  commissionPercent: number;
  energyCommission:  number;
  energyFee:         number;
  powerFee:          number;
  willCloseContract: boolean;
  contractedAt:      string | null;
  resultData:        any;
  createdAt:         string;
}

export interface ComparisonHistoryResponse {
  items:      ComparisonHistoryItem[];
  totalCount: number;
  page:       number;
  pageSize:   number;
  totalPages: number;
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

export interface ComparisonHistoryFilters {
  page?:             number;
  pageSize?:         number;
  willCloseContract?: boolean;
  from?:             string;
  to?:               string;
}
