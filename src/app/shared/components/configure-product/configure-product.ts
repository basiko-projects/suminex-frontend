import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { ServiceTariff } from '../../../core/models/service.model';
import { LuzOcrResult } from '../../../core/models/comparison.model';
import { FeeMode, Period } from '../../../core/models/comparator.models';
import { ALL_PERIODS, computeComparison } from '../../../core/helpers/calculator.helpers';

/** El catálogo aún no expone commissionEnergyPct por producto — hardcodeado a 65% hasta que se añada en BD. */
const DEFAULT_COMMISSION_PCT = 0.65;

@Component({
  selector: 'app-configure-product',
  imports: [DecimalPipe, FormsModule, ButtonModule, DialogModule, SelectModule, SliderModule],
  templateUrl: './configure-product.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigureProduct implements OnInit {
  @Input() tariff!: ServiceTariff;
  @Input() ocr!: LuzOcrResult;
  @Output() closed = new EventEmitter<void>();

  producto = signal('');
  precioMedio = signal(20);
  feeEnergia = signal(10);
  feePotencia = signal(2);
  feeMode = signal<FeeMode>('Global');
  feeEnergiaByPeriod = signal<number[]>(Array(6).fill(10));
  feePotenciaByPeriod = signal<number[]>(Array(6).fill(2));
  showPrices = signal(true);

  productOpts: { label: string; value: string }[] = [];

  ngOnInit() {
    this.productOpts = (this.tariff.products ?? []).map(p => ({ label: p.name, value: p.name }));
    this.producto.set(this.productOpts[0]?.value ?? '');
  }

  periodsPresent = computed<Period[]>(() => {
    const ocr = this.ocr;
    return ALL_PERIODS.filter(p => {
      const kwh = ocr.energia?.find(e => `P${e.p}` === p)?.activa?.kwh ?? 0;
      const kw = ocr.potencia?.find(x => `P${x.p}` === p)?.contratada?.kw ?? 0;
      return kwh > 0 || kw > 0;
    });
  });

  private commissionPct(): number {
    const p = this.tariff.products?.find(p => p.name === this.producto());
    return p?.commissionEnergyPct ?? DEFAULT_COMMISSION_PCT;
  }

  comisionEnergiaPct = computed<number>(() => this.commissionPct() * 100);

  result = computed(() => computeComparison(this.tariff, {
    producto: this.producto(),
    precioMedio: this.precioMedio(),
    feeEnergia: this.feeEnergia(),
    feePotencia: this.feePotencia(),
    comisionEnergia: this.commissionPct(),
    feeMode: this.feeMode(),
    feeEnergiaByPeriod: this.feeEnergiaByPeriod(),
    feePotenciaByPeriod: this.feePotenciaByPeriod(),
  }, this.ocr));

  periodIndex(p: Period): number { return ALL_PERIODS.indexOf(p); }

  onFeeEnergiaChange(value: number) {
    this.feeEnergia.set(value);
    this.feeEnergiaByPeriod.set(Array(6).fill(value));
  }

  onFeePotenciaChange(value: number) {
    this.feePotencia.set(value);
    this.feePotenciaByPeriod.set(Array(6).fill(value));
  }

  setFeeEnergiaAt(index: number, value: number) {
    const next = [...this.feeEnergiaByPeriod()];
    next[index] = value;
    this.feeEnergiaByPeriod.set(next);
  }

  setFeePotenciaAt(index: number, value: number) {
    const next = [...this.feePotenciaByPeriod()];
    next[index] = value;
    this.feePotenciaByPeriod.set(next);
  }
}
