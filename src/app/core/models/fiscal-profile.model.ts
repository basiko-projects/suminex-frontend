export interface FiscalProfile {
  id:               string;
  taxId:            string;
  businessName:     string;
  fiscalStreet:     string;
  fiscalCity:       string;
  fiscalPostalCode: string;
  fiscalProvince:   string;
  iban:             string;
  appliesVat:       boolean;
  vatRate:          number;
}

export interface UpsertFiscalProfileDto {
  taxId:            string;
  businessName:     string;
  fiscalStreet:     string;
  fiscalCity:       string;
  fiscalPostalCode: string;
  fiscalProvince:   string;
  iban:             string;
  appliesVat?:      boolean;
  vatRate?:         number;
}
