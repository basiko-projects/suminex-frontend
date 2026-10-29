export type OwnershipChange = 'with-change' | 'without-change' | null;

export interface HolderData {
  fullName: string;
  nationalId: string;
  phoneCountry: string;
  phoneNumber: string;
  email: string;
  /** true = fullName/nationalId pasan a ser razón social/CIF, y se piden los 3 campos de contacto de empresa */
  isCompanyHolder: boolean;
  tradeName: string;
  contactName: string;
  contactDni: string;
  cnae: string;
  /** Solo aplica con cambio de titularidad y titular particular (no empresa) — obligatorio para Gana */
  previousHolderDni: string;
}

export interface SupplyPointData {
  streetAddress: string;
  number: string;
  floor: string;
  door: string;
  postalCode: string;
  province: string;
  city: string;
  cups: string;
  bankAccount: string;
  phoneToPort: string;
}
