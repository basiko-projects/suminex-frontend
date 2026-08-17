import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { ServiceTariff } from '../../core/models/service.model';
import { LuzOcrResult } from '../../core/models/comparison.model';
import { ComparatorResult, Period, FeeMode } from './comparator.models';
import { computeComparison } from './calculator.helpers';

const ALL_PERIODS: Period[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

/** El catálogo aún no expone commissionEnergyPct por producto — hardcodeado a 65% hasta que se añada en BD. */
const DEFAULT_COMMISSION_PCT = 0.65;

@Component({
  selector: 'app-configurar-producto',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DialogModule, ButtonModule, SelectModule, SliderModule],
  template: `
    <p-dialog
      [visible]="true"
      header="Configura el producto"
      [modal]="true"
      [style]="{ width: '640px' }"
      [draggable]="false"
      [closable]="true"
      (onHide)="closed.emit()"
    >
      <div class="cfg-body">

        <div class="cfg-row">
          <div class="cfg-field">
            <label class="cfg-label">Producto</label>
            <p-select [options]="productOpts" [ngModel]="producto()" (ngModelChange)="producto.set($event)"
                      optionLabel="label" optionValue="value" class="w-full" />
            <span class="cfg-hint">Comisión del producto: {{ comisionEnergiaPct() | number:'1.0-2' }}%</span>
          </div>
          <div class="cfg-field">
            <label class="cfg-label">Precio medio OMIE (€/MWh)</label>
            <input type="number" class="cfg-input" [ngModel]="precioMedio()" (ngModelChange)="precioMedio.set($event)" />
          </div>
        </div>

        <div class="cfg-tabs">
          <button class="cfg-tab" [class.active]="feeMode() === 'Global'" (click)="feeMode.set('Global')">Global</button>
          <button class="cfg-tab" [class.active]="feeMode() === 'Periods'" (click)="feeMode.set('Periods')">
            Por período <span class="cfg-tab-dot"></span>
          </button>
        </div>

        @if (feeMode() === 'Global') {
          <div class="cfg-slider-field">
            <div class="cfg-slider-hdr">
              <span>Fee Energía <small>€/MWh</small></span>
              <strong class="cfg-slider-val">{{ feeEnergia() }}</strong>
            </div>
            <p-slider [ngModel]="feeEnergia()" (ngModelChange)="onFeeEnergiaChange($event)" [min]="0" [max]="50" />
          </div>
          <div class="cfg-slider-field">
            <div class="cfg-slider-hdr">
              <span>Fee Potencia <small>€/kW/año</small></span>
              <strong class="cfg-slider-val">{{ feePotencia() }}</strong>
            </div>
            <p-slider [ngModel]="feePotencia()" (ngModelChange)="onFeePotenciaChange($event)" [min]="0" [max]="20" />
          </div>
        } @else {
          @for (periodo of periodsPresent(); track periodo) {
            <div class="cfg-slider-field">
              <div class="cfg-slider-hdr">
                <span>Fee Energía {{ periodo }} <small>€/MWh</small></span>
                <strong class="cfg-slider-val">{{ feeEnergiaByPeriod()[periodIndex(periodo)] }}</strong>
              </div>
              <p-slider [ngModel]="feeEnergiaByPeriod()[periodIndex(periodo)]"
                        (ngModelChange)="setFeeEnergiaAt(periodIndex(periodo), $event)" [min]="0" [max]="50" />
            </div>
            <div class="cfg-slider-field">
              <div class="cfg-slider-hdr">
                <span>Fee Potencia {{ periodo }} <small>€/kW/año</small></span>
                <strong class="cfg-slider-val">{{ feePotenciaByPeriod()[periodIndex(periodo)] }}</strong>
              </div>
              <p-slider [ngModel]="feePotenciaByPeriod()[periodIndex(periodo)]"
                        (ngModelChange)="setFeePotenciaAt(periodIndex(periodo), $event)" [min]="0" [max]="20" />
            </div>
          }
        }

        <div class="cfg-metrics">
          <div class="cfg-metric-card">
            <span class="cfg-metric-label">Comisión comercial</span>
            <strong class="cfg-metric-val">{{ result().comision | number:'1.0-2' }}€</strong>
            <span class="cfg-metric-extra">+ 10% extra</span>
          </div>
          <div class="cfg-metric-card cfg-metric-card--savings">
            <span class="cfg-metric-label">Ahorro cliente</span>
            <strong class="cfg-metric-val">{{ result().ahorroEstudio | number:'1.0-2' }}€ al mes</strong>
            <span class="cfg-metric-sub">{{ result().ahorroXAnio | number:'1.0-2' }}€ al año</span>
            <span class="cfg-metric-badge">+{{ result().ahorroPorcent | number:'1.2-2' }}% de ahorro</span>
          </div>
        </div>

        <div class="cfg-collapsible">
          <button class="cfg-collapsible-hdr" (click)="showPrices.set(!showPrices())">
            <span><i class="pi pi-bolt"></i> Precios ofertados</span>
            <i class="pi" [class.pi-minus]="showPrices()" [class.pi-plus]="!showPrices()"></i>
          </button>
          @if (showPrices()) {
            <div class="cfg-prices-grid">
              @for (p of result().periodos; track p.periodo) {
                <span class="cfg-price-item">Energía {{ p.periodo }}: <strong>{{ p.precioEnergiaOferta }}</strong></span>
                <span class="cfg-price-item">Potencia {{ p.periodo }}: <strong>{{ p.precioPotenciaOferta }}</strong></span>
              }
            </div>
          }
        </div>

      </div>

      <ng-template pTemplate="footer">
        <div class="cfg-footer">
          <div class="cfg-footer-left">
            <p-button label="Exportar Excel" icon="pi pi-file-excel" severity="secondary" [outlined]="true"
                      [disabled]="true" title="Próximamente" />
            <p-button label="Descargar PDF" icon="pi pi-file-pdf" severity="secondary" [outlined]="true"
                      [disabled]="true" title="Próximamente" />
          </div>
          <p-button label="Continuar" icon="pi pi-arrow-right" (onClick)="continued.emit(result())" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .cfg-body { display: flex; flex-direction: column; gap: 1.25rem; }

    .cfg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .cfg-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .cfg-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sx-text-3); }
    .cfg-hint { font-size: 0.72rem; color: var(--sx-text-3); }
    .cfg-input {
      width: 100%; padding: 0.6rem 0.75rem;
      border: 1.5px solid var(--sx-border); border-radius: 8px;
      font-size: 0.88rem; color: var(--sx-text); background: var(--sx-surface);
      font-family: inherit; box-sizing: border-box;
    }
    .cfg-input:focus { outline: none; border-color: var(--sx-primary); }

    .cfg-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--sx-border); }
    .cfg-tab {
      padding: 0.55rem 0.9rem; border: none; background: none; cursor: pointer;
      font-size: 0.85rem; font-weight: 600; color: var(--sx-text-2);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      display: flex; align-items: center; gap: 6px; font-family: inherit;
    }
    .cfg-tab.active { color: var(--sx-primary); border-bottom-color: var(--sx-primary); }
    .cfg-tab-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sx-primary); }

    .cfg-slider-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .cfg-slider-hdr { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.85rem; font-weight: 600; color: var(--sx-text); }
    .cfg-slider-hdr small { font-weight: 400; color: var(--sx-text-3); }
    .cfg-slider-val { color: var(--sx-primary); font-size: 0.95rem; }

    .cfg-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .cfg-metric-card {
      border: 1px solid var(--sx-border); border-radius: 10px; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.3rem;
    }
    .cfg-metric-card--savings { border-color: var(--sx-green); background: var(--sx-green-bg); }
    .cfg-metric-label { font-size: 0.8rem; color: var(--sx-text-2); }
    .cfg-metric-val { font-size: 1.4rem; font-weight: 800; color: var(--sx-text); }
    .cfg-metric-sub { font-size: 0.85rem; font-weight: 700; color: var(--sx-text); }
    .cfg-metric-badge { font-size: 0.78rem; font-weight: 600; color: var(--sx-green); }
    .cfg-metric-extra { font-size: 0.78rem; font-weight: 600; color: var(--sx-green); }

    .cfg-collapsible { border: 1px solid var(--sx-border); border-radius: 10px; overflow: hidden; }
    .cfg-collapsible-hdr {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 0.85rem 1rem; background: var(--sx-surface-2); border: none; cursor: pointer;
      font-size: 0.9rem; font-weight: 700; color: var(--sx-text); font-family: inherit;
    }
    .cfg-collapsible-hdr .pi-bolt { color: var(--sx-primary); margin-right: 6px; }
    .cfg-prices-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; padding: 1rem; font-size: 0.85rem; color: var(--sx-text-2); }
    .cfg-price-item strong { color: var(--sx-primary); }

    :host ::ng-deep .w-full { width: 100% !important; }

    .cfg-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 0.75rem; }
    .cfg-footer-left { display: flex; gap: 0.5rem; }

    /* p-slider centrado — se reimplementa el track/handle explícitamente para no depender del theme */
    .cfg-slider-field { padding-top: 0.15rem; }
    :host ::ng-deep .cfg-slider-field p-slider,
    :host ::ng-deep .cfg-slider-field .p-slider {
      display: block; width: 100%; position: relative;
      height: 4px; border-radius: 4px; background: var(--sx-border);
    }
    :host ::ng-deep .cfg-slider-field .p-slider-range {
      position: absolute; top: 0; left: 0; height: 100%;
      border-radius: 4px; background: var(--sx-primary);
    }
    :host ::ng-deep .cfg-slider-field .p-slider-handle {
      position: absolute; top: 50%; transform: translate(-50%, -50%);
      width: 16px; height: 16px; border-radius: 50%;
      background: var(--sx-surface); border: 2px solid var(--sx-primary);
      cursor: pointer; margin: 0;
    }
  `],
})
export class ConfigurarProductoComponent implements OnInit {
  @Input() tariff!: ServiceTariff;
  @Input() ocr!: LuzOcrResult;
  @Output() closed = new EventEmitter<void>();
  @Output() continued = new EventEmitter<ComparatorResult>();

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
