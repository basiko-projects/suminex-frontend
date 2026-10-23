/** Hoy el único valor válido es "GanaEnergia" — un código que no coincide con ningún adaptador real
 *  simplemente no hace nada (sin error visible), por eso el form usa un dropdown fijo, no texto libre. */
export type ExternalIntegrationCode = 'GanaEnergia';

export interface Provider {
  id:                      string;
  name:                    string;
  logoUrl:                 string;
  createdAt:               string;
  updatedAt:               string;
  externalIntegrationCode: ExternalIntegrationCode | null;
}
