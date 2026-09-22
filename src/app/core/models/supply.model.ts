import { IconName } from '../../shared/components/icon/icon';

export type SupplyStatus = 'PendingIdentityVerification' | 'Pending' | 'InProgress' | 'Optimized' | 'Cancelled';
export type CategoryCode = 'LUZ' | 'GAS' | 'MOVIL' | 'INTERNET';

export type SupplyKind = 'electricity' | 'gas' | 'internet' | null;

export interface SupplyOption {
  id: SupplyKind;
  label: string;
  description: string;
  icon: IconName;
  available: boolean;
}

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
  optimizedAt:          string | null;
  cancellationReason:   string | null;
  cancelledAt:          string | null;
  createdAt:            string;
  updatedAt:            string;
}

/** Respuesta de POST /api/supplies/{id}/complete — pasa el suministro a Optimized (facturable) */
export interface CompleteSupplyResponse {
  id:          string;
  status:      SupplyStatus;
  optimizedAt: string;
}

/** Respuesta de POST /api/supplies/{id}/cancel — Admin, o el Collaborator dueño; funciona en cualquier estado incluido Optimized */
export interface CancelSupplyResponse {
  id:                 string;
  status:             SupplyStatus;
  cancellationReason: string | null;
  cancelledAt:        string;
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

/** Respuesta de POST /api/supplies/register-with-identity — único endpoint de alta; siempre 200 si los datos base
 *  son válidos, incluso cuando la identidad no se pudo verificar (verificationSuccess: false, supply igual creado). */
export interface RegisterSupplyResponse {
  id:                   string;
  status:               SupplyStatus;
  estimatedSavings:     number;
  verificationSuccess:  boolean;
  verificationMessage:  string | null;
  dniFrontDocumentId:   string | null;
  dniBackDocumentId:    string | null;
}

/** Respuesta de POST /api/supplies/verify-identity — coteja el OCR de las fotos del DNI contra holderDni; sin id de suministro.
 *  isVerified/message: solo los manda una versión más nueva del backend — el entorno actual todavía responde
 *  documentNumber/fullName/birthDate/expirationDate en su lugar, sin isVerified (un 200 OK ya implica éxito). */
export interface VerifyIdentityResponse {
  dniFrontDocumentId: string;
  dniBackDocumentId:  string;
  isVerified?:        boolean;
  message?:           string | null;
  documentNumber?:    string;
  fullName?:          string | null;
  birthDate?:         string | null;
  expirationDate?:    string | null;
}

/** Respuesta de POST /api/supplies/{id}/link-identity — enlaza documentos ya verificados a un suministro existente, pasa a InProgress */
export interface LinkIdentityResponse {
  id:                 string;
  status:             SupplyStatus;
  dniFrontDocumentId: string;
  dniBackDocumentId:  string;
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
