import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ServiceTariff } from '../../../core/models/service.model';
import { LuzOcrResult } from '../../../core/models/comparison.model';
import { computeComparison } from '../../../core/helpers/calculator.helpers';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-configure-product',
  imports: [DecimalPipe, FormsModule, ButtonModule, DialogModule, SelectModule, InputTextModule, Icon],
  templateUrl: './configure-product.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigureProduct implements OnInit {
  @Input() tariff!: ServiceTariff;
  @Input() ocr!: LuzOcrResult;
  @Output() closed = new EventEmitter<void>();

  producto = signal('');
  /** Precio medio OMIE estimado (€/MWh) — solo afecta a productos Indexed */
  precioMedio = signal(20);
  showPrices = signal(true);

  productOpts: { label: string; value: string }[] = [];

  /** Solo productos con comisión fija configurada — igual que el filtro de elegibilidad de Nuevo suministro.
   *  GET /api/services ya trae energyPeriods/powerPeriods completos por producto, no hace falta otra llamada. */
  ngOnInit() {
    this.productOpts = (this.tariff.products ?? [])
      .filter(p => p.isActive && p.fixedCommissionAmount != null)
      .map(p => ({ label: p.name, value: p.name }));
    this.producto.set(this.productOpts[0]?.value ?? '');
  }

  /** true si el producto elegido es Indexed — solo entonces tiene sentido mostrar el campo de precio medio OMIE */
  isIndexedSelected = computed(() => {
    const p = this.tariff.products?.find(p => p.name === this.producto());
    return (p?.type ?? '').toUpperCase() !== 'FIXED';
  });

  result = computed(() => computeComparison(this.tariff, {
    producto: this.producto(),
    precioMedio: this.precioMedio(),
  }, this.ocr));

  ahorroCardClasses(negative: boolean): string {
    const base = 'border rounded-lg p-4 flex flex-col gap-1';
    return negative ? `${base} border-sx-red bg-sx-red-bg` : `${base} border-sx-green bg-sx-green-bg`;
  }

  ahorroPercentClasses(negative: boolean): string {
    const base = 'text-[0.78rem] font-semibold';
    return negative ? `${base} text-sx-red` : `${base} text-sx-green`;
  }
}
