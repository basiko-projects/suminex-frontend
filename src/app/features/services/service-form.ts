import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../core/services/services.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ServiceType, CreateServiceDto, ServiceListItem,
  ProductDto, GasDetailDto, GasTierDto, MobileDetailDto, InternetDetailDto,
  BoePeriodItem, OmieDistribution, CreateBoePeriodsDto, CreateOmieDistributionDto,
} from '../../core/models/service.model';
import { SlicePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

const PERIODS = ['P1','P2','P3','P4','P5','P6'];

function emptyProduct(): ProductDto {
  return {
    name: '', productType: 'INDEXED',
    commissionEnergyPct: null, commissionPowerPct: null,
    validFrom: '', validUntil: null,
    energyPeriods: PERIODS.map(p => ({ period: p, priceKwh: null, baseValue: null })),
    powerPeriods:  PERIODS.map(p => ({ period: p, priceKwDay: null })),
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
    SlicePipe,
    DialogModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, DatePickerModule, ToggleSwitchModule, TooltipModule,
    TabsModule, TagModule,
  ],
  template: `
    <p-dialog [visible]="true"
              [header]="dialogTitle"
              [modal]="true"
              [style]="{width:'780px', maxHeight:'92vh'}"
              [draggable]="false" [closable]="true"
              (onHide)="cancelled.emit()">

      <div class="dialog-subtitle">{{ dialogSubtitle }}</div>

      @if (loadingEdit()) {
        <div class="edit-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando datos…</span>
        </div>
      } @else {

      <div class="form-body">

        @if (apiError) {
          <div class="api-error"><i class="pi pi-exclamation-circle"></i><span>{{ apiError }}</span></div>
        }

        <!-- ══ Estado (solo edición) ══ -->
        @if (editId) {
          <div class="status-bar" [class.status-active]="isActiveEdit" [class.status-inactive]="!isActiveEdit">
            <div class="status-info">
              <i [class]="'pi ' + (isActiveEdit ? 'pi-check-circle' : 'pi-pause-circle')"></i>
              <span>{{ isActiveEdit ? 'Oferta activa' : 'Oferta inactiva' }}</span>
              @if (activationHint) {
                <span class="activation-hint">{{ activationHint }}</span>
              }
            </div>
            <div class="toggle-wrap">
              <p-toggleswitch [(ngModel)]="isActiveEdit" (onChange)="onActiveToggle()" />
            </div>
          </div>
        }

        <!-- ══ LUZ ══ -->
        @if (dto.serviceType === 'LUZ') {
          <p-tabs [(value)]="luzTab">
            <p-tablist>
              <p-tab value="tarifa">Tarifa</p-tab>
              <p-tab value="boe">Potencia BOE</p-tab>
              <p-tab value="omie">Reparto OMIE</p-tab>
            </p-tablist>
            <p-tabpanels>

            <!-- ── Tab: Tarifa ── -->
            <p-tabpanel value="tarifa">
              <div class="tab-content">
                <div class="top-row">
                  <div class="field">
                    <label>TARIFA</label>
                    <p-select [options]="tariffOpts" [(ngModel)]="dto.tariffCode"
                              optionLabel="label" optionValue="value"
                              placeholder="Seleccionar tarifa" class="w-full"
                              (onChange)="onTariffChange()" [disabled]="!!editId" />
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
                    @for (ep of visibleEnergyPeriods; track ep.period) {
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
                      <div class="commission-inline">
                        <span class="commission-label">Comisión %</span>
                        <input type="number" class="commission-input" [(ngModel)]="product.commissionPowerPct" placeholder="—" step="0.01" />
                      </div>
                      <input type="number" class="common-input" [(ngModel)]="powerCommon" placeholder="Valor común" step="0.00000001" />
                      <button class="apply-btn" (click)="applyPowerCommon()">Aplicar a todos</button>
                    </div>
                  </div>
                  <div class="periods-grid-3">
                    @for (pp of visiblePowerPeriods; track pp.period) {
                      <div class="period-field">
                        <label class="period-label">{{ pp.period }}</label>
                        <input type="number" class="period-input" [(ngModel)]="pp.priceKwDay" step="0.00000001" placeholder="0.00000000" />
                      </div>
                    }
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- ── Tab: Potencia BOE ── -->
            <p-tabpanel value="boe">
              <div class="tab-content">
                @if (existingBoe.length) {
                  <div class="existing-section">
                    <div class="existing-title">BOE actual</div>
                    <div class="periods-grid-3">
                      @for (b of existingBoe; track b.period) {
                        <div class="period-card-sm">
                          <span class="period-lbl-sm">{{ b.period }}</span>
                          <span class="period-val-sm">{{ b.priceKwDay }}</span>
                          <span class="period-date-sm">desde {{ b.validFrom | slice:0:10 }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
                <div class="section-label mt-sm">{{ existingBoe.length ? 'Reemplazar períodos BOE' : 'Registrar períodos BOE' }}</div>
                <div class="row-2 mb">
                  <div class="field">
                    <label>VÁLIDO DESDE <span class="req">*</span></label>
                    <p-datepicker [(ngModel)]="boe.validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" />
                  </div>
                  <div class="field">
                    <label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label>
                    <p-datepicker [(ngModel)]="boe.validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" />
                  </div>
                </div>
                <div class="period-card">
                  <div class="period-card-header">
                    <div class="period-card-title"><i class="pi pi-bolt" style="color:#60A5FA"></i> Valores BOE (€/kW·día)</div>
                  </div>
                  <div class="periods-grid-3">
                    @for (p of visibleBoePeriods; track p.period) {
                      <div class="period-field">
                        <label class="period-label">{{ p.period }}</label>
                        <input type="number" class="period-input" [(ngModel)]="p.value" step="0.000001" placeholder="0.000000" />
                      </div>
                    }
                  </div>
                </div>
                @if (boeError) { <div class="api-error mt-sm"><i class="pi pi-exclamation-circle"></i><span>{{ boeError }}</span></div> }
                <button class="save-tab-btn" [disabled]="boeSaving()" (click)="saveBoe()">
                  @if (boeSaving()) { <i class="pi pi-spin pi-spinner"></i> } @else { <i class="pi pi-check"></i> }
                  Guardar BOE
                </button>
              </div>
            </p-tabpanel>

            <!-- ── Tab: Reparto OMIE ── -->
            <p-tabpanel value="omie">
              <div class="tab-content">
                @if (existingOmie.length) {
                  <div class="existing-section">
                    <div class="existing-title">Distribuciones registradas</div>
                    @for (o of existingOmie; track o.id) {
                      <div class="omie-row">
                        <div class="omie-info">
                          <span class="omie-name">{{ o.name }}</span>
                          <span class="omie-dates">{{ o.validFrom | slice:0:10 }}{{ o.validUntil ? ' → ' + (o.validUntil | slice:0:10) : '' }}</span>
                        </div>
                        <p-tag [value]="o.isActive ? 'Activa' : 'Inactiva'" [severity]="o.isActive ? 'success' : 'secondary'" />
                      </div>
                    }
                  </div>
                }
                <div class="section-label mt-sm">Nueva distribución OMIE</div>
                <div class="row-2 mb">
                  <div class="field">
                    <label>NOMBRE <span class="req">*</span></label>
                    <input pInputText [(ngModel)]="omie.name" placeholder="Ej: Reparto OMIE 2026" class="w-full" />
                  </div>
                  <div class="field">
                    <label>MARGEN</label>
                    <p-inputnumber [(ngModel)]="omie.margin" [minFractionDigits]="4" [maxFractionDigits]="6" placeholder="—" class="w-full" />
                  </div>
                </div>
                <div class="row-2 mb">
                  <div class="field">
                    <label>VÁLIDO DESDE <span class="req">*</span></label>
                    <p-datepicker [(ngModel)]="omie.validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" />
                  </div>
                  <div class="field">
                    <label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label>
                    <p-datepicker [(ngModel)]="omie.validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" />
                  </div>
                </div>
                <div class="period-card">
                  <div class="period-card-header">
                    <div class="period-card-title"><i class="pi pi-chart-line" style="color:#A78BFA"></i> Factores OMIE</div>
                  </div>
                  <div class="periods-grid-3">
                    @for (p of visibleOmiePeriods; track p.period) {
                      <div class="period-field">
                        <label class="period-label">{{ p.period }}</label>
                        <input type="number" class="period-input" [(ngModel)]="p.factor" step="0.0001" placeholder="1.0000" />
                      </div>
                    }
                  </div>
                </div>
                @if (omieError) { <div class="api-error mt-sm"><i class="pi pi-exclamation-circle"></i><span>{{ omieError }}</span></div> }
                <button class="save-tab-btn save-tab-purple" [disabled]="omieSaving()" (click)="saveOmie()">
                  @if (omieSaving()) { <i class="pi pi-spin pi-spinner"></i> } @else { <i class="pi pi-plus"></i> }
                  Crear distribución
                </button>
              </div>
            </p-tabpanel>

            </p-tabpanels>
          </p-tabs>
        }

        <!-- ══ GAS ══ -->
        @if (dto.serviceType === 'GAS') {
          <div class="top-row mb">
            <div class="field span-2">
              <label>NOMBRE <span class="req">*</span></label>
              <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Tarifa Gas Fijo RL1" class="w-full" />
            </div>
            <div class="field">
              <label>CÓDIGO TARIFA</label>
              <input pInputText [(ngModel)]="dto.tariffCode" placeholder="Ej: RL.1" class="w-full" [disabled]="!!editId" />
            </div>
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
          <div class="period-card">
            <div class="period-card-header">
              <div class="period-card-title"><i class="pi pi-fire" style="color:#FB923C"></i> Detalle gas</div>
            </div>
            <div class="row-3">
              <div class="field"><label>Tipo</label><p-select [options]="gasTypeOpts" [(ngModel)]="gas.productType" optionLabel="label" optionValue="value" class="w-full" /></div>
              <div class="field"><label>Término fijo (€/día)</label><p-inputnumber [(ngModel)]="gas.fixedTermDay" [minFractionDigits]="3" [maxFractionDigits]="5" class="w-full" /></div>
              <div class="field"><label>Margen (€/kWh)</label><p-inputnumber [(ngModel)]="gas.marginKwh" [minFractionDigits]="4" [maxFractionDigits]="6" class="w-full" /></div>
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

        <!-- ══ MOBILE ══ -->
        @if (dto.serviceType === 'MOBILE') {
          <div class="top-row mb">
            <div class="field span-2"><label>NOMBRE <span class="req">*</span></label>
              <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Tarifa Mobile 50GB" class="w-full" /></div>
            <div class="field"><label>RED</label>
              <p-select [options]="networkOpts" [(ngModel)]="mobile.network" optionLabel="label" optionValue="value" class="w-full" /></div>
          </div>
          <div class="row-2 mb">
            <div class="field"><label>VÁLIDO DESDE</label><p-datepicker [(ngModel)]="validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" /></div>
            <div class="field"><label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label><p-datepicker [(ngModel)]="validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" /></div>
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

        <!-- ══ INTERNET ══ -->
        @if (dto.serviceType === 'INTERNET') {
          <div class="top-row mb">
            <div class="field span-2"><label>NOMBRE <span class="req">*</span></label>
              <input pInputText [(ngModel)]="dto.name" placeholder="Ej: Fibra 600MB Simétrica" class="w-full" /></div>
            <div class="field"><label>TECNOLOGÍA</label>
              <p-select [options]="techOpts" [(ngModel)]="internet.technology" optionLabel="label" optionValue="value" class="w-full" /></div>
          </div>
          <div class="row-2 mb">
            <div class="field"><label>VÁLIDO DESDE</label><p-datepicker [(ngModel)]="validFromDate" dateFormat="dd/mm/yy" [showIcon]="true" class="w-full" /></div>
            <div class="field"><label>VÁLIDO HASTA <span class="optional-label">(opcional)</span></label><p-datepicker [(ngModel)]="validUntilDate" dateFormat="dd/mm/yy" [showIcon]="true" [showClear]="true" class="w-full" /></div>
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

      </div>
      } <!-- end @else loadingEdit -->

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

    /* Status bar (edit mode) */
    .status-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.7rem 0.875rem; border-radius: 10px; margin-bottom: 1rem;
      border: 1px solid; gap: 1rem;
    }
    .status-bar.status-active   { background: rgba(22,163,74,0.08);  border-color: rgba(22,163,74,0.25); }
    .status-bar.status-inactive { background: rgba(148,163,184,0.08); border-color: var(--sx-border); }
    .status-info { display: flex; align-items: center; gap: 0.6rem; font-size: 0.83rem; font-weight: 600; flex: 1; }
    .status-active   .status-info { color: var(--sx-green); }
    .status-inactive .status-info { color: var(--sx-text-3); }
    .status-info .pi { font-size: 0.9rem; flex-shrink: 0; }
    .activation-hint {
      font-size: 0.75rem; font-weight: 400; color: var(--sx-text-2);
      background: var(--sx-surface-2); border: 1px solid var(--sx-border);
      border-radius: 6px; padding: 2px 8px;
    }
    .toggle-wrap {
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 2px;
    }

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

    /* Tabs */
    .tab-content { padding: 0.875rem 0 0; }

    /* Existing BOE/OMIE section */
    .existing-section { margin-bottom: 1rem; }
    .existing-title {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--sx-text-3);
      margin-bottom: 0.5rem;
    }
    .period-card-sm {
      background: var(--sx-surface-2); border: 1px solid var(--sx-border);
      border-radius: 8px; padding: 0.5rem 0.75rem;
      display: flex; flex-direction: column; gap: 0.1rem;
    }
    .period-lbl-sm  { font-size: 0.7rem; font-weight: 700; color: var(--sx-text-3); }
    .period-val-sm  { font-size: 0.88rem; font-weight: 700; color: var(--sx-text); font-variant-numeric: tabular-nums; }
    .period-date-sm { font-size: 0.68rem; color: var(--sx-text-3); }

    /* OMIE list row */
    .omie-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 0.75rem; border-radius: 8px;
      border: 1px solid var(--sx-border); background: var(--sx-surface-2);
      margin-bottom: 0.4rem;
    }
    .omie-info { display: flex; flex-direction: column; gap: 0.1rem; }
    .omie-name  { font-size: 0.83rem; font-weight: 600; color: var(--sx-text); }
    .omie-dates { font-size: 0.72rem; color: var(--sx-text-3); }

    /* Save tab button */
    .save-tab-btn {
      margin-top: 0.75rem;
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.25rem; border-radius: 8px;
      background: var(--sx-primary); color: #fff;
      border: none; font-size: 0.83rem; font-weight: 600;
      cursor: pointer; transition: background 140ms;
    }
    .save-tab-btn:hover:not(:disabled) { background: var(--sx-primary-btn); }
    .save-tab-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .save-tab-purple { background: #7C3AED; }
    .save-tab-purple:hover:not(:disabled) { background: #6D28D9; }

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
  isActiveEdit    = true;
  activationHint  = '';
  private wasActive = true;

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

  // Tabs LUZ
  luzTab = 'tarifa';

  // BOE
  existingBoe: BoePeriodItem[] = [];
  boeError  = '';
  boeSaving = signal(false);
  boe = {
    validFromDate:  null as Date | null,
    validUntilDate: null as Date | null,
    periods: PERIODS.map(p => ({ period: p, value: null as number | null })),
  };

  // OMIE
  existingOmie: OmieDistribution[] = [];
  omieError  = '';
  omieSaving = signal(false);
  omie = {
    name:           '',
    margin:         null as number | null,
    validFromDate:  null as Date | null,
    validUntilDate: null as Date | null,
    periods: PERIODS.map(p => ({ period: p, factor: null as number | null })),
  };

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
      this.wasActive       = this.editItem.isActive;
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
            id:                  p.id,
            name:                p.name ?? '',
            productType:         p.productType ?? 'INDEXED',
            commissionEnergyPct: p.commissionEnergyPct ?? null,
            commissionPowerPct:  p.commissionPowerPct  ?? null,
            validFrom:           p.validFrom  ?? '',
            validUntil:          p.validUntil ?? null,
            // Merge API periods with full P1-P6 set, null for missing ones
            energyPeriods: PERIODS.map(per => {
              const found = p.energyPeriods?.find(ep => ep.period === per);
              return { period: per, priceKwh: found?.priceKwh ?? null, baseValue: found?.baseValue ?? null };
            }),
            powerPeriods: PERIODS.map(per => {
              const found = p.powerPeriods?.find(pp => pp.period === per);
              return { period: per, priceKwDay: found?.priceKwDay ?? null };
            }),
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

        if (rawType === 'LUZ') {
          this.existingBoe  = d.boePeriods          ?? [];
          this.existingOmie = d.omieDistributions   ?? [];
          // Pre-fill BOE inputs with existing values
          if (d.boePeriods?.length) {
            this.boe.periods = PERIODS.map(p => {
              const found = d.boePeriods!.find(b => b.period === p);
              return { period: p, value: found?.priceKwDay ?? null };
            });
            if (d.boePeriods[0]?.validFrom)  this.boe.validFromDate  = new Date(d.boePeriods[0].validFrom);
            if (d.boePeriods[0]?.validUntil) this.boe.validUntilDate = new Date(d.boePeriods[0].validUntil!);
          }
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

  get periodCount(): number {
    return this.dto.tariffCode === '2.0TD' ? 3 : 6;
  }

  get visibleEnergyPeriods() {
    return this.product.energyPeriods.slice(0, this.periodCount);
  }

  get visiblePowerPeriods() {
    return this.product.powerPeriods.slice(0, this.periodCount);
  }

  get visibleBoePeriods() {
    return this.boe.periods.slice(0, this.periodCount);
  }

  get visibleOmiePeriods() {
    return this.omie.periods.slice(0, this.periodCount);
  }

  onTypeChange() {
    this.product = emptyProduct();
  }

  onActiveToggle() {
    if (this.isActiveEdit && !this.wasActive) {
      // Activating a previously inactive service → auto-set 1 month validity
      const today     = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      this.validFromDate  = today;
      this.validUntilDate = nextMonth;
      this.activationHint = `Vigencia automática: hoy → ${nextMonth.toLocaleDateString('es-ES')}`;
    } else if (!this.isActiveEdit) {
      this.activationHint = '';
    }
    this.wasActive = this.isActiveEdit;
  }

  onTariffChange() {
    // Trim/expand periods when tariff changes
    const n = this.periodCount;
    if (this.product.energyPeriods.length !== n) {
      this.product.energyPeriods = PERIODS.slice(0, n).map(p => ({ period: p, priceKwh: null, baseValue: null }));
      this.product.powerPeriods  = PERIODS.slice(0, n).map(p => ({ period: p, priceKwDay: null }));
    }
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

  saveBoe() {
    if (!this.editId) return;
    this.boeError = '';
    if (!this.boe.validFromDate) { this.boeError = 'La fecha de inicio es obligatoria.'; return; }
    const dto: CreateBoePeriodsDto = {
      validFrom:  this.toIso(this.boe.validFromDate)!,
      validUntil: this.toIso(this.boe.validUntilDate),
      periods:    this.boe.periods
        .filter(p => p.value !== null)
        .map(p => ({ period: p.period, value: p.value! })),
    };
    if (!dto.periods.length) { this.boeError = 'Introduce al menos un período BOE.'; return; }
    this.boeSaving.set(true);
    this.svc.createBoe(this.editId, dto).subscribe({
      next:  () => { this.boeSaving.set(false); this.existingBoe = dto.periods.map(p => ({ period: p.period, priceKwDay: p.value, validFrom: dto.validFrom, validUntil: dto.validUntil })); },
      error: e  => { this.boeSaving.set(false); this.boeError = e?.error?.error ?? 'Error al guardar BOE.'; },
    });
  }

  saveOmie() {
    if (!this.editId) return;
    this.omieError = '';
    if (!this.omie.name)          { this.omieError = 'El nombre es obligatorio.'; return; }
    if (!this.omie.validFromDate) { this.omieError = 'La fecha de inicio es obligatoria.'; return; }
    const dto: CreateOmieDistributionDto = {
      name:       this.omie.name,
      margin:     this.omie.margin,
      validFrom:  this.toIso(this.omie.validFromDate)!,
      validUntil: this.toIso(this.omie.validUntilDate),
      periods:    this.omie.periods
        .filter(p => p.factor !== null)
        .map(p => ({ period: p.period, factor: p.factor! })),
    };
    if (!dto.periods.length) { this.omieError = 'Introduce al menos un factor OMIE.'; return; }
    this.omieSaving.set(true);
    this.svc.createOmie(this.editId, dto).subscribe({
      next:  () => {
        this.omieSaving.set(false);
        this.existingOmie = [...this.existingOmie, { id: Date.now(), name: dto.name, margin: dto.margin, isActive: true, validFrom: dto.validFrom, validUntil: dto.validUntil, periods: dto.periods }];
        this.omie = { name: '', margin: null, validFromDate: null, validUntilDate: null, periods: PERIODS.map(p => ({ period: p, factor: null })) };
      },
      error: e => { this.omieSaving.set(false); this.omieError = e?.error?.error ?? 'Error al crear distribución OMIE.'; },
    });
  }

  submit() {
    this.apiError = '';
    if (!this.dto.name) { this.apiError = 'El nombre de la oferta es obligatorio.'; return; }

    this.dto.validFrom  = this.toIso(this.validFromDate);
    this.dto.validUntil = this.toIso(this.validUntilDate);

    let payload: any;

    if (this.editId) {
      // PUT PATCH-like: solo se actualiza lo que se manda
      payload = {} as any;

      if (this.dto.name)                  payload.name      = this.dto.name;
      if (this.dto.validFrom)             payload.validFrom = this.dto.validFrom;
      // validUntil puede ser null (quitar fecha fin) o una fecha — siempre la mandamos
      payload.validUntil = this.dto.validUntil;
      payload.isActive   = this.isActiveEdit;

      if (this.dto.serviceType === 'LUZ' && this.product.id) {
        this.product.validFrom = this.dto.validFrom ?? '';
        this.product.validUntil = this.dto.validUntil;
        payload.products = [{
          id:                  this.product.id,
          name:                this.product.name || undefined,
          productType:         this.product.productType,
          commissionEnergyPct: this.product.commissionEnergyPct,
          commissionPowerPct:  this.product.commissionPowerPct,
          validFrom:           this.product.validFrom || undefined,
          validUntil:          this.product.validUntil,
          energyPeriods:       this.product.energyPeriods,
          powerPeriods:        this.product.powerPeriods,
        }];
      }
      if (this.dto.serviceType === 'GAS')      payload.gasDetail      = this.gas;
      if (this.dto.serviceType === 'MOBILE')   payload.mobileDetail   = this.mobile;
      if (this.dto.serviceType === 'INTERNET') payload.internetDetail = this.internet;
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
