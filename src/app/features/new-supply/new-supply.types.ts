export type OwnershipChange = 'with-change' | 'without-change' | null;

export interface HolderData {
  fullName: string;
  nationalId: string;
  phoneCountry: string;
  phoneNumber: string;
  email: string;
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
