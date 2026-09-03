import { Injectable, signal } from '@angular/core';

export interface BillingTarget {
  collaboratorId: string;
  collaboratorName: string;
}

/** Pasa a Facturación qué colaborador ver, sin exponerlo en la URL (query params) — se setea antes de navegar y se lee/limpia una sola vez */
@Injectable({ providedIn: 'root' })
export class BillingContextService {
  private target = signal<BillingTarget | null>(null);

  setTarget(target: BillingTarget) {
    this.target.set(target);
  }

  /** Se lee una sola vez: la devuelve y la limpia, para que un refresh o una vuelta al sidebar no la reutilice sin querer */
  consumeTarget(): BillingTarget | null {
    const target = this.target();
    this.target.set(null);
    return target;
  }
}
