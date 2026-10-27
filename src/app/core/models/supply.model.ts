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
  /** true = con cambio de titularidad (manda codigo_cambio "MZ" a Gana), false = alta nueva (manda "CZ") */
  isHolderChange:       boolean;
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

/** Respuesta de POST /api/supplies/validate-iban y /validate-phone */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export type ExternalSubmissionStatusValue = 'Pending' | 'Submitted' | 'Confirmed' | 'Failed';

/** Respuesta de GET /api/supplies/{id}/external-submission y de su retry — 404 si nunca se intentó un envío
 *  (el caso normal: el producto del suministro no tiene proveedor con integración externa activa). */
export interface ExternalSubmissionStatus {
  supplyId:               string;
  integrationCode:        string;
  status:                 ExternalSubmissionStatusValue;
  externalContractId:     string | null;
  externalContractNumber: string | null;
  errorMessage:           string | null;
  attemptCount:           number;
  lastAttemptAt:          string | null;
  confirmedAt:            string | null;
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

/** Respuesta de POST /api/supplies/register-with-identity y register-direct — siempre 200 si los datos base son
 *  válidos. verificationSuccess ya no coteja el DNI contra la foto (eso se quitó) — ahora es prácticamente
 *  siempre true, solo false por un fallo real de subida (red/S3). verificationMessage, cuando viene, ya no trae
 *  motivos de "no coincide"/"foto ilegible" — el manejo genérico existente (mostrar lo que mande el backend) sigue
 *  siendo correcto sin cambios. */
export interface RegisterSupplyResponse {
  id:                   string;
  status:               SupplyStatus;
  estimatedSavings:     number;
  verificationSuccess:  boolean;
  verificationMessage:  string | null;
  dniFrontDocumentId:   string | null;
  dniBackDocumentId:    string | null;
}

/** Respuesta de POST /api/supplies/verify-identity — ya NO coteja el DNI contra el OCR de la foto; solo sube los
 *  documentos. documentNumber es ahora literal el DNI que vino en el form (no el leído de la imagen), y
 *  fullName/birthDate/expirationDate ya SIEMPRE vienen null (antes a veces traían datos leídos del DNI). */
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
