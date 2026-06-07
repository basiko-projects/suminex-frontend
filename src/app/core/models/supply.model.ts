export type SupplyStatus = 'Pending' | 'Active' | 'Cancelled' | 'Completed' | 'InProgress';
export type CategoryCode = 'LUZ' | 'GAS' | 'MOVIL' | 'INTERNET';

export interface Supply {
  id:                   string;
  userId:               string;
  userFullName:         string;
  userEmail:            string;
  holderName:           string;
  holderEmail:          string;
  holderPhone:          string;
  holderDni:            string;
  holderIban:           string;
  isUserTheHolder:      boolean;
  serviceType:          CategoryCode;
  serviceName:          string;
  tariffCode:           string;
  cups:                 string;
  street:               string;
  floor:                string;
  door:                 string;
  postalCode:           string;
  province:             string;
  locality:             string;
  estimatedSavings:     number;
  status:               SupplyStatus;
  originFlow:           string;
  comparisonHistoryId:  string | null;
  dniFrontDocumentId:   string | null;
  dniBackDocumentId:    string | null;
  createdAt:            string;
  updatedAt:            string;
}

export interface SupplyListResponse {
  items:           Supply[];
  totalCount:      number;
  page:            number;
  pageSize:        number;
  totalPages:      number;
  hasNextPage:     boolean;
  hasPreviousPage: boolean;
}

export interface SupplyFilters {
  page?:        number;
  pageSize?:    number;
  userId?:      string;
  serviceType?: CategoryCode;
  status?:      SupplyStatus;
  dateFrom?:    string;
  dateTo?:      string;
  userName?:    string;
  userEmail?:   string;
}
