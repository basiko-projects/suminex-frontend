import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ServicesService } from '../../../../core/services/services.service';
import { SuminexLoader } from '../../../../shared/components/suminex-loader/suminex-loader';

@Component({
  selector: 'app-producto-luz-form',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule, SuminexLoader],
  templateUrl: './producto-luz-form.html',
})
export class ProductoLuzFormComponent implements OnInit {
  @Input() tariffId   = 0;
  @Input() tariffCode = '';
  @Input() editProduct: any = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc = inject(ServicesService);
  saving   = signal(false);
  apiError = '';
  sub      = false;
  periods  = ['P1','P2','P3','P4','P5','P6'];

  form = { name: '', productType: 'INDEXED', commissionEnergyPct: null as number|null, commissionPowerPct: null as number|null, validFrom: '', validUntil: '' };

  productTypeOpts = [
    { label: 'FIXED — precio fijo',    value: 'FIXED' },
    { label: 'INDEXED — precio OMIE',  value: 'INDEXED' },
  ];

  energyPeriods: (number|null)[] = Array(6).fill(null);
  powerPeriods:  (number|null)[] = Array(6).fill(null);
  energyCommon: number|null = null;
  powerCommon:  number|null = null;

  get periodCount() { return this.tariffCode === '2.0TD' ? 3 : 6; }
  get visiblePeriods() { return this.periods.slice(0, this.periodCount); }
  /** Máximo 3 columnas por fila — con 6 períodos esto reparte en dos filas de 3 en vez de una fila apretada de 6 */
  get columnCount() { return Math.min(this.periodCount, 3); }

  ngOnInit() {
    if (!this.editProduct) return;
    const p = this.editProduct;
    this.form.name                = p.name ?? '';
    this.form.productType         = p.productType ?? 'INDEXED';
    this.form.commissionEnergyPct = p.commissionEnergyPct ?? null;
    this.form.commissionPowerPct  = p.commissionPowerPct  ?? null;
    this.form.validFrom           = p.validFrom  ? p.validFrom.slice(0, 10)  : '';
    this.form.validUntil          = p.validUntil ? p.validUntil.slice(0, 10) : '';
    this.energyPeriods = this.periods.map((_, i) => p.energyPeriods?.[i]?.priceKwh ?? p.energyPeriods?.[i]?.baseValue ?? null);
    this.powerPeriods  = this.periods.map((_, i) => p.powerPeriods?.[i]?.priceKwDay ?? null);
  }

  applyEnergy() {
    if (this.energyCommon === null) return;
    this.energyPeriods = this.energyPeriods.map((v, i) => i < this.periodCount ? this.energyCommon : v);
  }
  applyPower() {
    if (this.powerCommon === null) return;
    this.powerPeriods = this.powerPeriods.map((v, i) => i < this.periodCount ? this.powerCommon : v);
  }

  submit() {
    this.sub = true;
    if (!this.form.name) return;
    this.apiError = '';
    const payload: any = {
        name: this.form.name,
        productType: this.form.productType,
        commissionEnergyPct: this.form.commissionEnergyPct,
        commissionPowerPct:  this.form.commissionPowerPct,
        validFrom: this.form.validFrom || null,
        validUntil: this.form.validUntil || null,
        energyPeriods: this.visiblePeriods
          .map((p, i) => ({ period: p, priceKwh: this.energyPeriods[i] }))
          .filter((_, i) => this.energyPeriods[i] !== null),
        powerPeriods: this.visiblePeriods
          .map((p, i) => ({ period: p, priceKwDay: this.powerPeriods[i] }))
          .filter((_, i) => this.powerPeriods[i] !== null),
    };
    this.saving.set(true);
    const req = this.editProduct?.id
      ? this.svc.updateProduct(this.tariffId, this.editProduct.id, payload)
      : this.svc.createProduct(this.tariffId, payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (e: any) => { this.saving.set(false); this.apiError = e?.error?.error ?? 'Error al guardar.'; },
    });
  }
}
