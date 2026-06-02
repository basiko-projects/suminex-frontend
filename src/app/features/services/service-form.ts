import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../core/services/services.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ServiceType, CreateServiceDto, ServiceListItem,
  ProductDto, GasDetailDto, GasTierDto, MobileDetailDto, InternetDetailDto,
} from '../../core/models/service.model';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

const PERIODS = ['P1','P2','P3','P4','P5','P6'];

function emptyProduct(): ProductDto {
  return {
    name: '', productType: 'INDEXED',
    commissionEnergyPct: null, commissionPowerPct: null,
    validFrom: '', validUntil: null,
    energyPeriods: PERIODS.map(p => ({ period: p, priceKwh: 0, baseValue: null })),
    powerPeriods:  PERIODS.map(p => ({ period: p, priceKwDay: 0 })),
  };
}

function emptyGasTier(order: number): GasTierDto {
  return { tierOrder: order, minKwh: 0, maxKwh: null, priceKwh: 0 };
}

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, DatePickerModule, ToggleSwitchModule, TooltipModule,
  ],
  template: `
    <p-dialog [visible]="true"
              [header]="dialogTitle"
              [modal]="true"
              [style]="editId ? {width:'500px'} : {width:'780px', maxHeight:'92vh'}"
              [draggable]="false" [closable]="true"
              (onHide)="cancelled.emit()">

      <div class="dialog-subtitle">{{ dialogSubtitle }}</div>

      <div class="form-body">

        @if (apiError) {
          <div class="api-error"><i class="pi pi-exclamation-circle"></i><span>{{ apiError }}</span></div>
        }

        <!-- ══ MODO EDICIÓN: solo nombre, estado y fechas ══ -->
        @if (editId) {

          <div class="field mb">
            <label>NOMBRE DE LA OFERTA <span class="req">*</span></label>
            <input pInputText [(ngModel)]="dto.name" class="w-full" />
          </div>

          <div class="row-2 mb">
            <div class="field">
              <label>VÁLIDO DESDE</label>
              <p-datepicker [(ngModel)]="validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" />
            </div>
            <div class="field">
              <label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label>
              <p-datepicker [(ngModel)]="validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" />
            </div>
          </div>

          <div class="field toggle-inline mb">
            <label>ESTADO</label>
            <p-toggleswitch [(ngModel)]="isActiveEdit" />
            <span class="toggle-val">{{ isActiveEdit ? 'Activo' : 'Inactivo' }}</span>
          </div>

        }

        <!-- ══ MODO CREACIÓN: formulario completo ══ -->
        @if (!editId) {

          <!-- LUZ -->
          @if (dto.serviceType === 'LUZ') {
            <div class="top-row">
              <div class="field">
                <label>TARIFA</label>
                <p-select [options]="tariffOpts" [(ngModel)]="dto.tariffCode"
                          optionLabel="label" optionValue="value"
                          placeholder="Seleccionar tarifa" class="w-full" />
              </div>
              <div class="field">
                <label>TIPO DE PRODUCTO</label>
                <p-select [options]="productTypeOpts" [(ngModel)]="product.productType"
                          optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div class="field">
                <label>NOMBRE DEL PRODUCTO <span class="req">*</span></label>
                <input pInputText [(ngModel)]="product.name" placeholder="Ej: Index Base" class="w-full" />
              </div>
            </div>
            <div class="row-3 mb">
              <div class="field">
                <label>NOMBRE DE LA OFERTA <span class="req">*</span></label>
                <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Tarifa Luz Plana 2.0TD" class="w-full" />
              </div>
              <div class="field">
                <label>VÁLIDO DESDE</label>
                <p-datepicker [(ngModel)]="validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" />
              </div>
              <div class="field">
                <label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label>
                <p-datepicker [(ngModel)]="validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" />
              </div>
            </div>
            <div class="period-card">
              <div class="period-card-header">
                <div class="period-card-left">
                  <div class="period-card-title"><i class="pi pi-bolt" style="color:#FACC15"></i> Precios de energía (€/kWh)</div>
                  <div class="commission-inline">
                    <span class="commission-label">Comisión %</span>
                    <input type="number" class="commission-input" [(ngModel)]="product.commissionEnergyPct" placeholder="—" step="0.01" />
                  </div>
                </div>
                <div class="period-card-actions">
                  <input type="number" class="common-input" [(ngModel)]="energyCommon" placeholder="Valor común" step="0.000001" />
                  <button class="apply-btn" (click)="applyEnergyCommon()">Aplicar a todos</button>
                </div>
              </div>
              <div class="periods-grid-3">
                @for (ep of product.energyPeriods; track ep.period) {
                  <div class="period-field">
                    <label class="period-label">{{ ep.period }}</label>
                    <input type="number" class="period-input" [(ngModel)]="ep.priceKwh" step="0.000001" placeholder="0.000000" />
                  </div>
                }
              </div>
            </div>
            <div class="period-card">
              <div class="period-card-header">
                <div class="period-card-left">
                  <div class="period-card-title"><i class="pi pi-circle" style="color:#60A5FA"></i> Precios de potencia (€/kW·día)</div>
                </div>
                <div class="period-card-actions">
                  <span class="boe-link" (click)="loadBoe()">Cargar BOE</span>
                  <div class="commission-inline">
                    <span class="commission-label">Comisión %</span>
                    <input type="number" class="commission-input" [(ngModel)]="product.commissionPowerPct" placeholder="—" step="0.01" />
                  </div>
                  <input type="number" class="common-input" [(ngModel)]="powerCommon" placeholder="Valor común" step="0.00000001" />
                  <button class="apply-btn" (click)="applyPowerCommon()">Aplicar a todos</button>
                </div>
              </div>
              <div class="periods-grid-3">
                @for (pp of product.powerPeriods; track pp.period) {
                  <div class="period-field">
                    <label class="period-label">{{ pp.period }}</label>
                    <input type="number" class="period-input" [(ngModel)]="pp.priceKwDay" step="0.00000001" placeholder="0.00000000" />
                  </div>
                }
              </div>
            </div>
          }

          <!-- GAS -->
          @if (dto.serviceType === 'GAS') {
            <div class="top-row mb">
              <div class="field span-2">
                <label>NOMBRE <span class="req">*</span></label>
                <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Tarifa Gas Fijo RL1" class="w-full" />
              </div>
              <div class="field">
                <label>CÓDIGO TARIFA</label>
                <input pInputText [(ngModel)]="dto.tariffCode" placeholder="Ej: RL.1" class="w-full" />
              </div>
            </div>
            <div class="period-card">
              <div class="period-card-header">
                <div class="period-card-title"><i class="pi pi-fire" style="color:#FB923C"></i> Detalle gas</div>
              </div>
              <div class="row-3">
                <div class="field"><label>Tipo</label>
                  <p-select [options]="gasTypeOpts" [(ngModel)]="gas.productType" optionLabel="label" optionValue="value" class="w-full" /></div>
                <div class="field"><label>Término fijo (€/día)</label>
                  <p-inputnumber [(ngModel)]="gas.fixedTermDay" [minFractionDigits]="3" [maxFractionDigits]="5" class="w-full" /></div>
                <div class="field"><label>Margen (€/kWh)</label>
                  <p-inputnumber [(ngModel)]="gas.marginKwh" [minFractionDigits]="4" [maxFractionDigits]="6" class="w-full" /></div>
              </div>
            </div>
            <div class="section-label mt-sm">Tramos <button class="add-btn" (click)="addTier()"><i class="pi pi-plus"></i> Añadir</button></div>
            <div class="tiers-header"><span>Orden</span><span>Desde (kWh)</span><span>Hasta (kWh)</span><span>Precio (€/kWh)</span><span></span></div>
            @for (tier of gas.tiers; track $index) {
              <div class="tier-row">
                <span class="tier-order">{{ tier.tierOrder }}</span>
                <p-inputnumber [(ngModel)]="tier.minKwh" [min]="0" class="w-full" />
                <p-inputnumber [(ngModel)]="tier.maxKwh" [min]="0" placeholder="Sin límite" class="w-full" />
                <p-inputnumber [(ngModel)]="tier.priceKwh" [minFractionDigits]="3" [maxFractionDigits]="5" class="w-full" />
                @if (gas.tiers.length > 1) {
                  <button class="del-btn" (click)="removeTier($index)"><i class="pi pi-trash"></i></button>
                }
              </div>
            }
          }

          <!-- MOBILE -->
          @if (dto.serviceType === 'MOBILE') {
            <div class="top-row mb">
              <div class="field span-2"><label>NOMBRE <span class="req">*</span></label>
                <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Tarifa Mobile 50GB" class="w-full" /></div>
              <div class="field"><label>RED</label>
                <p-select [options]="networkOpts" [(ngModel)]="mobile.network" optionLabel="label" optionValue="value" class="w-full" /></div>
            </div>
            <div class="period-card">
              <div class="period-card-header"><div class="period-card-title"><i class="pi pi-mobile" style="color:#A78BFA"></i> Detalle móvil</div></div>
              <div class="row-3">
                <div class="field"><label>Cuota mensual (€) <span class="req">*</span></label><p-inputnumber [(ngModel)]="mobile.monthlyFee" [minFractionDigits]="2" class="w-full" /></div>
                <div class="field"><label>Datos (GB)</label><p-inputnumber [(ngModel)]="mobile.dataGb" [min]="0" class="w-full" /></div>
                <div class="field"><label>Minutos voz</label><p-inputnumber [(ngModel)]="mobile.voiceMinutes" [min]="0" placeholder="Ilimitado" class="w-full" /></div>
              </div>
              <div class="row-3">
                <div class="field"><label>Extra GB (€)</label><p-inputnumber [(ngModel)]="mobile.extraGbPrice" [minFractionDigits]="2" class="w-full" /></div>
                <div class="field"><label>Permanencia (meses)</label><p-inputnumber [(ngModel)]="mobile.permanenceMonths" [min]="0" class="w-full" /></div>
                <div class="field"><label>Penalización (€)</label><p-inputnumber [(ngModel)]="mobile.cancellationFee" [minFractionDigits]="2" class="w-full" /></div>
              </div>
            </div>
          }

          <!-- INTERNET -->
          @if (dto.serviceType === 'INTERNET') {
            <div class="top-row mb">
              <div class="field span-2"><label>NOMBRE <span class="req">*</span></label>
                <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Fibra 600MB Simétrica" class="w-full" /></div>
              <div class="field"><label>TECNOLOGÍA</label>
                <p-select [options]="techOpts" [(ngModel)]="internet.technology" optionLabel="label" optionValue="value" class="w-full" /></div>
            </div>
            <div class="period-card">
              <div class="period-card-header"><div class="period-card-title"><i class="pi pi-wifi" style="color:#60A5FA"></i> Detalle internet</div></div>
              <div class="row-3">
                <div class="field"><label>Cuota mensual (€) <span class="req">*</span></label><p-inputnumber [(ngModel)]="internet.monthlyFee" [minFractionDigits]="2" class="w-full" /></div>
                <div class="field"><label>Bajada (Mbps)</label><p-inputnumber [(ngModel)]="internet.speedDownMbps" [min]="0" class="w-full" /></div>
                <div class="field"><label>Subida (Mbps)</label><p-inputnumber [(ngModel)]="internet.speedUpMbps" [min]="0" class="w-full" /></div>
              </div>
              <div class="row-3">
                <div class="field"><label>Permanencia (meses)</label><p-inputnumber [(ngModel)]="internet.permanenceMonths" [min]="0" class="w-full" /></div>
                <div class="field"><label>Penalización (€)</label><p-inputnumber [(ngModel)]="internet.cancellationFee" [minFractionDigits]="2" class="w-full" /></div>
                <div class="field toggle-inline"><label>Router incluido</label><p-toggleswitch [(ngModel)]="internet.routerIncluded" /></div>
              </div>
            </div>
          }

        } <!-- end @if !editId -->

      </div>

      <!-- Type chips — solo en creación -->
      @if (!editId) {
        <ng-template pTemplate="header">
          <div class="custom-header">
            <span>{{ dialogTitle }}</span>
            <div class="type-selector-row">
              @for (t of typeOpts; track t.value) {
                <button class="type-sel-btn" [class.active]="dto.serviceType === t.value"
                        (click)="dto.serviceType = t.value; onTypeChange()">
                  <i [class]="'pi ' + typeIcon(t.value)"></i>{{ t.label }}
                </button>
              }
            </div>
          </div>
        </ng-template>
      }

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true"
                  (onClick)="cancelled.emit()" [disabled]="saving()" />
        <p-button [label]="editId ? 'Guardar cambios' : 'Crear oferta'"
                  icon="pi pi-check" (onClick)="submit()" [loading]="saving()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .dialog-subtitle {
      font-size: 0.82rem; color: var(--sx-text-3);
      margin: -0.5rem 0 1.25rem;
    }
    .edit-loading {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      padding: 2.5rem; color: var(--sx-text-3); font-size: 0.875rem;
    }
    .edit-loading .pi { font-size: 1.25rem; color: var(--sx-primary); }

    .form-body { display: flex; flex-direction: column; gap: 0; }

    .top-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 0.875rem; margin-bottom: 1rem;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; margin-bottom: 1rem; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.875rem; }
    .span-2 { grid-column: span 2; }
    .mt-sm  { margin-top: 0.75rem; }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--sx-text-3);
    }
    .req { color: #f87171; }
    .optional-label { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--sx-text-3); font-size: 0.68rem; }

    :host ::ng-deep .w-full { width: 100% !important; }
    :host ::ng-deep p-select.w-full > .p-select,
    :host ::ng-deep p-datepicker.w-full { width: 100% !important; }
    :host ::ng-deep p-inputnumber.w-full .p-inputnumber,
    :host ::ng-deep p-inputnumber.w-full input { width: 100% !important; }

    /* ── Period card ── */
    .period-card {
      border: 1px solid var(--sx-border);
      border-radius: 10px; padding: 1rem;
      margin-bottom: 0.875rem;
    }
    .period-card-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem; margin-bottom: 0.875rem;
    }
    .period-card-left { display: flex; align-items: center; gap: 1rem; }
    .period-card-title {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem; font-weight: 700; color: var(--sx-text); white-space: nowrap;
    }
    .period-card-title .pi { font-size: 0.9rem; }
    .period-card-actions {
      display: flex; align-items: center; gap: 0.5rem;
    }

    /* Commission inline */
    .commission-inline { display: flex; align-items: center; gap: 6px; }
    .commission-label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--sx-text-3); white-space: nowrap;
    }
    .commission-input {
      width: 72px; height: 32px; border-radius: 6px;
      border: 1px solid var(--sx-border); background: var(--sx-surface-2);
      color: var(--sx-text); font-size: 0.82rem; padding: 0 0.5rem;
      text-align: center; outline: none;
    }
    .commission-input:focus { border-color: var(--sx-primary); }
    .commission-input::placeholder { color: var(--sx-text-3); }

    /* Valor común input */
    .common-input {
      width: 130px; height: 34px; border-radius: 7px;
      border: 1px solid var(--sx-border); background: var(--sx-surface-2);
      color: var(--sx-text-2); font-size: 0.8rem; padding: 0 0.75rem;
      outline: none;
    }
    .common-input:focus { border-color: var(--sx-primary); color: var(--sx-text); }
    .common-input::placeholder { color: var(--sx-text-3); }

    /* Aplicar a todos */
    .apply-btn {
      height: 34px; padding: 0 0.875rem; border-radius: 7px;
      border: 1px solid var(--sx-border); background: var(--sx-surface);
      color: var(--sx-text-2); font-size: 0.8rem; font-weight: 500;
      cursor: pointer; transition: all 120ms; white-space: nowrap;
    }
    .apply-btn:hover { border-color: var(--sx-primary); color: var(--sx-primary); }

    /* Cargar BOE */
    .boe-link {
      font-size: 0.78rem; font-weight: 600; color: var(--sx-primary);
      cursor: pointer; white-space: nowrap;
    }
    .boe-link:hover { text-decoration: underline; }

    /* Period grid 3-column */
    .periods-grid-3 {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.625rem;
    }
    .period-field { display: flex; flex-direction: column; gap: 0.3rem; }
    .period-label {
      font-size: 0.72rem; font-weight: 700; color: var(--sx-text-3);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .period-input {
      width: 100%; height: 38px; border-radius: 7px;
      border: 1px solid var(--sx-border); background: var(--sx-surface-2);
      color: var(--sx-text); font-size: 0.85rem; padding: 0 0.75rem;
      outline: none; transition: border-color 120ms;
    }
    .period-input:focus { border-color: var(--sx-primary); background: var(--sx-surface); }
    .period-input::placeholder { color: var(--sx-text-3); font-size: 0.78rem; }

    /* Section label */
    .section-label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--sx-text-3);
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 0.4rem; border-bottom: 1px solid var(--sx-border);
      margin-bottom: 0.5rem;
    }

    /* Tier table */
    .tiers-header {
      display: grid; grid-template-columns: 48px 1fr 1fr 1fr 32px;
      gap: 8px; padding: 0 0 4px;
      font-size: 0.7rem; font-weight: 700; color: var(--sx-text-3); text-transform: uppercase;
    }
    .tier-row {
      display: grid; grid-template-columns: 48px 1fr 1fr 1fr 32px;
      gap: 8px; align-items: center; margin-bottom: 4px;
    }
    .tier-order { text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--sx-text-3); }

    /* Toggle inline */
    .mb { margin-bottom: 1rem; }
    .toggle-inline { flex-direction: row !important; align-items: center; gap: 0.75rem !important; }
    .toggle-inline label { margin: 0 !important; flex-shrink: 0; }
    .toggle-val { font-size: 0.83rem; color: var(--sx-text-2); }

    /* Buttons */
    .add-btn {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.72rem; font-weight: 600; padding: 3px 10px;
      border-radius: 6px; border: 1px solid var(--sx-border);
      background: transparent; color: var(--sx-primary); cursor: pointer;
    }
    .add-btn:hover { background: rgba(61,142,255,0.08); }
    .del-btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-3); cursor: pointer; transition: all 120ms;
    }
    .del-btn:hover { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

    /* Custom header with type selector */
    .custom-header { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
    .custom-header > span { font-size: 1rem; font-weight: 700; color: var(--sx-text); }
    .type-selector-row { display: flex; gap: 6px; }
    .type-sel-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0.35rem 0.8rem; border-radius: 8px;
      border: 1px solid var(--sx-border); background: transparent;
      color: var(--sx-text-2); font-size: 0.8rem; font-weight: 500; cursor: pointer;
      transition: all 120ms;
    }
    .type-sel-btn .pi { font-size: 0.75rem; }
    .type-sel-btn:hover { border-color: var(--sx-primary); color: var(--sx-text); }
    .type-sel-btn.active {
      background: var(--sx-primary); border-color: var(--sx-primary);
      color: #fff; font-weight: 600;
    }

    .api-error {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25);
      color: #f87171; border-radius: 8px; padding: 0.65rem 0.9rem;
      font-size: 0.82rem; margin-bottom: 0.875rem;
    }
  `]
})
export class ServiceFormComponent implements OnInit {
  @Input()  editId:   number | null          = null;
  @Input()  editItem: ServiceListItem | null = null;
  @Output() saved     = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private svc  = inject(ServicesService);
  private auth = inject(AuthService);

  saving      = signal(false);
  loadingEdit = signal(false);
  apiError    = '';
  isActiveEdit = true;

  validFromDate:  Date | null = null;
  validUntilDate: Date | null = null;

  dto: CreateServiceDto = {
    name: '', serviceType: 'LUZ', tariffCode: null,
    validFrom: null, validUntil: null,
    products: [emptyProduct()],
  };

  product  = emptyProduct();
  gas:     GasDetailDto     = { productType: 'FIXED', fixedTermDay: null, marginKwh: null, indexMargin: null, commissionKwh: null, tiers: [emptyGasTier(1)] };
  mobile:  MobileDetailDto  = { monthlyFee: 0, dataGb: null, network: 'G4', voiceMinutes: null, extraGbPrice: null, permanenceMonths: null, cancellationFee: null };
  internet: InternetDetailDto = { monthlyFee: 0, speedDownMbps: 0, speedUpMbps: 0, technology: 'FIBER', permanenceMonths: null, cancellationFee: null, routerIncluded: true, includesTv: false };

  energyCommon: number | null = null;
  powerCommon:  number | null = null;

  get dialogTitle(): string {
    const map: Record<string, string> = { LUZ: 'Nueva oferta de Luz', GAS: 'Nueva oferta de Gas', MOBILE: 'Nueva oferta Móvil', INTERNET: 'Nueva oferta Internet' };
    return this.editId ? 'Editar servicio' : (map[this.dto.serviceType] ?? 'Nueva oferta');
  }
  get dialogSubtitle(): string {
    if (this.dto.serviceType === 'LUZ') return 'Selecciona la tarifa y configura los precios de energía y potencia.';
    if (this.dto.serviceType === 'GAS') return 'Configura el tipo de producto y los tramos de precio del gas.';
    if (this.dto.serviceType === 'MOBILE') return 'Define los datos y condiciones de la tarifa móvil.';
    return 'Configura la velocidad y condiciones del servicio de internet.';
  }

  tariffOpts = [
    { label: '2.0TD', value: '2.0TD' },
    { label: '3.0TD', value: '3.0TD' },
    { label: '6.1TD', value: '6.1TD' },
  ];

  typeOpts: { label: string; value: ServiceType }[] = [
    { label: 'Luz',      value: 'LUZ'      },
    { label: 'Gas',      value: 'GAS'      },
    { label: 'Móvil',    value: 'MOBILE'   },
    { label: 'Internet', value: 'INTERNET' },
  ];
  productTypeOpts = [
    { label: 'Indexed (precio + OMIE × factor)', value: 'INDEXED' },
    { label: 'Fixed (precio configurado tal cual)', value: 'FIXED'   },
  ];
  gasTypeOpts  = [{ label: 'Fijo', value: 'FIXED' }, { label: 'Indexado', value: 'INDEXED' }];
  networkOpts  = [{ label: '4G', value: 'G4' }, { label: '5G', value: 'G5' }, { label: '3G', value: 'G3' }];
  techOpts     = [{ label: 'Fibra', value: 'FIBER' }, { label: 'HFC', value: 'HFC' }, { label: 'ADSL', value: 'ADSL' }];

  typeIcon(t: string): string {
    const m: Record<string, string> = { LUZ: 'pi-sun', GAS: 'pi-fire', MOBILE: 'pi-mobile', INTERNET: 'pi-wifi' };
    return m[t] ?? 'pi-bolt';
  }

  ngOnInit() {
    if (!this.editId) return;

    // Pre-populate basic fields immediately from the list item (no API call needed)
    if (this.editItem) {
      const t = (this.editItem.serviceType as string).toUpperCase() as ServiceType;
      this.dto.serviceType = t;
      this.dto.name        = this.editItem.name;
      this.dto.tariffCode  = this.editItem.tariffCode ?? null;
      this.isActiveEdit    = this.editItem.isActive;
      if (this.editItem.validFrom)  this.validFromDate  = new Date(this.editItem.validFrom);
      if (this.editItem.validUntil) this.validUntilDate = new Date(this.editItem.validUntil);
    }

    this.loadingEdit.set(true);
    this.svc.getById(this.editId).subscribe({
      next: d => {
        console.debug('[ServiceForm] getById response:', d);
        this.loadingEdit.set(false);

        // Normalize serviceType to uppercase (API may return "luz", "LUZ", etc.)
        const rawType = (d.serviceType as string).toUpperCase() as ServiceType;
        this.dto.serviceType = rawType;
        this.dto.name        = d.name;
        this.dto.tariffCode  = d.tariffCode ?? null;
        if (d.validFrom)  this.validFromDate  = new Date(d.validFrom);
        if (d.validUntil) this.validUntilDate = new Date(d.validUntil);

        // Populate type-specific fields
        if (rawType === 'LUZ' && d.products?.length) {
          const p = d.products[0];
          this.product = {
            name:                p.name ?? '',
            productType:         p.productType ?? 'INDEXED',
            commissionEnergyPct: p.commissionEnergyPct ?? null,
            commissionPowerPct:  p.commissionPowerPct  ?? null,
            validFrom:           p.validFrom  ?? '',
            validUntil:          p.validUntil ?? null,
            energyPeriods: p.energyPeriods?.length
              ? p.energyPeriods
              : PERIODS.map(per => ({ period: per, priceKwh: 0, baseValue: null })),
            powerPeriods: p.powerPeriods?.length
              ? p.powerPeriods
              : PERIODS.map(per => ({ period: per, priceKwDay: 0 })),
          };
        }

        if (rawType === 'GAS' && d.gasDetail) {
          this.gas = {
            productType:   d.gasDetail.productType   ?? 'FIXED',
            fixedTermDay:  d.gasDetail.fixedTermDay  ?? null,
            marginKwh:     d.gasDetail.marginKwh     ?? null,
            indexMargin:   d.gasDetail.indexMargin   ?? null,
            commissionKwh: d.gasDetail.commissionKwh ?? null,
            tiers: d.gasDetail.tiers?.length
              ? d.gasDetail.tiers
              : [emptyGasTier(1)],
          };
        }

        if (rawType === 'MOBILE' && d.mobileDetail) {
          this.mobile = {
            monthlyFee:       d.mobileDetail.monthlyFee       ?? 0,
            dataGb:           d.mobileDetail.dataGb           ?? null,
            network:          d.mobileDetail.network          ?? 'G4',
            voiceMinutes:     d.mobileDetail.voiceMinutes     ?? null,
            extraGbPrice:     d.mobileDetail.extraGbPrice     ?? null,
            permanenceMonths: d.mobileDetail.permanenceMonths ?? null,
            cancellationFee:  d.mobileDetail.cancellationFee  ?? null,
          };
        }

        if (rawType === 'INTERNET' && d.internetDetail) {
          this.internet = {
            monthlyFee:       d.internetDetail.monthlyFee       ?? 0,
            speedDownMbps:    d.internetDetail.speedDownMbps    ?? 0,
            speedUpMbps:      d.internetDetail.speedUpMbps      ?? 0,
            technology:       d.internetDetail.technology       ?? 'FIBER',
            permanenceMonths: d.internetDetail.permanenceMonths ?? null,
            cancellationFee:  d.internetDetail.cancellationFee  ?? null,
            routerIncluded:   d.internetDetail.routerIncluded   ?? false,
            includesTv:       d.internetDetail.includesTv       ?? false,
          };
        }
      },
      error: e => {
        // If getById fails, we already have basic data from editItem — just hide spinner
        console.warn('[ServiceForm] getById failed, using list item data only:', e);
        this.loadingEdit.set(false);
      },
    });
  }

  onTypeChange() {
    this.product = emptyProduct();
  }

  applyEnergyCommon() {
    if (this.energyCommon === null) return;
    this.product.energyPeriods.forEach(ep => ep.priceKwh = this.energyCommon!);
  }

  applyPowerCommon() {
    if (this.powerCommon === null) return;
    this.product.powerPeriods.forEach(pp => pp.priceKwDay = this.powerCommon!);
  }

  loadBoe() {
    // TODO: connect BOE endpoint
  }

  addTier()             { this.gas.tiers = [...this.gas.tiers, emptyGasTier(this.gas.tiers.length + 1)]; }
  removeTier(i: number) { this.gas.tiers = this.gas.tiers.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, tierOrder: idx + 1 })); }

  private toIso(d: Date | null): string | null {
    return d ? d.toISOString().split('T')[0] : null;
  }

  submit() {
    this.apiError = '';
    if (!this.dto.name) { this.apiError = 'El nombre de la oferta es obligatorio.'; return; }

    this.dto.validFrom  = this.toIso(this.validFromDate);
    this.dto.validUntil = this.toIso(this.validUntilDate);

    let payload: any;

    if (this.editId) {
      // PUT: solo campos editables según la API
      payload = {
        name:      this.dto.name,
        isActive:  this.isActiveEdit,
        validFrom: this.dto.validFrom,
        validUntil: this.dto.validUntil,
      };
    } else {
      // POST: payload completo por tipo
      if (this.dto.serviceType === 'LUZ' && !this.product.name) {
        this.apiError = 'El nombre del producto es obligatorio.'; return;
      }
      payload = {
        serviceType: this.dto.serviceType,
        name:        this.dto.name,
        tariffCode:  this.dto.tariffCode || null,
        validFrom:   this.dto.validFrom,
        validUntil:  this.dto.validUntil,
      };
      if (this.dto.serviceType === 'LUZ') {
        this.product.validFrom = this.dto.validFrom ?? '';
        payload.products = [this.product];
      }
      if (this.dto.serviceType === 'GAS')      payload.gasDetail      = this.gas;
      if (this.dto.serviceType === 'MOBILE')   payload.mobileDetail   = this.mobile;
      if (this.dto.serviceType === 'INTERNET') payload.internetDetail = this.internet;
    }

    console.log('[ServiceForm] payload →', JSON.stringify(payload, null, 2));

    this.saving.set(true);
    const req = this.editId ? this.svc.update(this.editId, payload) : this.svc.create(payload);
    req.subscribe({
      next:  () => { this.saving.set(false); this.saved.emit(); },
      error: e  => { this.saving.set(false); this.apiError = e?.error?.message ?? 'Error al guardar la oferta.'; },
    });
  }
}
