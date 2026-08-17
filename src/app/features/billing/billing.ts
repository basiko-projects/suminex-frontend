import { Component } from '@angular/core';

@Component({
  selector: 'app-billing',
  standalone: true,
  template: `
    <div class="billing-empty">
      <div class="billing-icon"><i class="pi pi-receipt"></i></div>
      <h1 class="billing-title">Próximamente</h1>
      <p class="billing-sub">Estamos trabajando en el módulo de facturación.</p>
    </div>
  `,
  styles: [`
    .billing-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; gap: 0.75rem;
      min-height: 60vh; padding: 2rem;
    }
    .billing-icon {
      width: 64px; height: 64px; border-radius: 16px;
      background: var(--sx-surface-2); color: var(--sx-text-3);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; margin-bottom: 0.5rem;
    }
    .billing-title { font-size: 1.4rem; font-weight: 700; color: var(--sx-text); margin: 0; }
    .billing-sub { font-size: 0.9rem; color: var(--sx-text-2); margin: 0; }
  `]
})
export class BillingComponent {}
